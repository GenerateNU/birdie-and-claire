package llm

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"iter"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"slices"
	"time"

	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/log"

	"github.com/firebase/genkit/go/ai"
	"github.com/firebase/genkit/go/core"
	"github.com/firebase/genkit/go/core/logger"
	"github.com/firebase/genkit/go/core/status"
	"github.com/firebase/genkit/go/genkit"
	"github.com/firebase/genkit/go/plugins/compat_oai/openrouter"
	"github.com/firebase/genkit/go/plugins/middleware"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

const (
	// after the first attempt, so three requests at most
	maxRetries        = 2
	retryInitialDelay = 500 * time.Millisecond
	retryMaxDelay     = 4 * time.Second
	// the default transport keeps 2 idle conns per host and every call here hits one host
	maxIdleConnsPerGateway = 64
	// each turn is a billed model call; Genkit's default allows 50
	maxToolTurns = 5
)

//go:embed prompts/*.prompt
var promptFS embed.FS

// the statuses a mid-stream gateway failure can carry that are worth another attempt
var retryStatuses = []status.Name{status.Unavailable, status.ResourceExhausted, status.DeadlineExceeded, status.Internal}

type genkitClient struct {
	genkit  *genkit.Genkit
	modelID string
	model   ai.ModelRef
	retry   middleware.Retry
}

// New's ctx only bounds Genkit's reflection server, which runs when GENKIT_ENV=dev.
func New(ctx context.Context, cfg config.LLMConfig) Client {
	return newGenkitClient(ctx, cfg, middleware.Retry{
		MaxRetries:     maxRetries,
		InitialDelayMs: int(retryInitialDelay.Milliseconds()),
		MaxDelayMs:     int(retryMaxDelay.Milliseconds()),
	})
}

// newGenkitClient takes the retry policy so tests can shrink the backoff.
func newGenkitClient(ctx context.Context, cfg config.LLMConfig, retry middleware.Retry) *genkitClient {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.MaxIdleConnsPerHost = maxIdleConnsPerGateway

	plugin := &openrouter.OpenRouter{
		APIKey: cfg.APIKey,
		// applied after the plugin's defaults, so this base URL beats OPENROUTER_BASE_URL
		Opts: []option.RequestOption{
			// go.mod pins openai-go v1.12.0 over Genkit's v1.8.2, whose WithBaseURL races under concurrent calls
			option.WithBaseURL(cfg.BaseURL),
			// the Retry middleware owns retries; the SDK's own would multiply with it
			option.WithMaxRetries(0),
			// no timeout: it would cut streams, so a hung server without a ctx deadline blocks forever
			option.WithHTTPClient(&http.Client{Transport: transport}),
		},
	}

	retry.Statuses = retryStatuses
	return &genkitClient{
		// WithPromptFS reads the prompts directory by default, so no WithPromptDir
		genkit:  genkit.Init(ctx, genkit.WithPlugins(plugin), genkit.WithPromptFS(promptFS)),
		modelID: cfg.Model,
		model:   openrouter.ModelRef(cfg.Model, nil),
		retry:   retry,
	}
}

func (c *genkitClient) Generate(ctx context.Context, req Request) (Response, error) {
	start := time.Now()
	usage := &callUsage{}

	opts, err := c.options(ctx, req, usage)
	if err != nil {
		return Response{}, err
	}

	resp, err := genkit.Generate(quietGenkit(ctx), c.genkit, opts...)
	if err != nil {
		err = mapError(ctx, req, err)
	} else {
		err = checkFinish(resp, req)
	}

	c.logCall(ctx, usage, start, err)
	if err != nil {
		return Response{}, err
	}
	return Response{Text: resp.Text()}, nil
}

func (c *genkitClient) GenerateStream(ctx context.Context, req Request) (ChunkReader, error) {
	usage := &callUsage{}
	opts, err := c.options(ctx, req, usage)
	if err != nil {
		return nil, err
	}
	// an iter.Pull2 coroutine that only advances inside Next or Close, so Close is required
	next, stop := iter.Pull2(genkit.GenerateStream(quietGenkit(ctx), c.genkit, opts...))
	return &genkitStream{
		ctx:    ctx,
		client: c,
		req:    req,
		usage:  usage,
		start:  time.Now(),
		next:   next,
		stop:   stop,
	}, nil
}

func (c *genkitClient) options(ctx context.Context, req Request, usage *callUsage) ([]ai.GenerateOption, error) {
	opts := []ai.GenerateOption{
		ai.WithModel(c.model),
		// Retry wraps classify wraps usage; the deadline on ctx sits outside all three, so it is never retried
		ai.WithUse(c.retry, ai.MiddlewareFunc(classify), ai.MiddlewareFunc(usage.middleware)),
		ai.WithMaxTurns(maxToolTurns),
	}
	if req.promptName != "" {
		messages, err := c.renderPrompt(ctx, req)
		if err != nil {
			return nil, err
		}
		opts = append(opts, ai.WithMessages(messages...))
	} else {
		// %s so stray verbs in shopper text are never interpreted
		opts = append(opts, ai.WithPrompt("%s", req.Prompt))
		if req.System != "" {
			opts = append(opts, ai.WithSystem("%s", req.System))
		}
	}
	if req.outputType != nil {
		opts = append(opts, ai.WithOutputType(req.outputType))
	}
	if config := chatConfig(req); config != nil {
		opts = append(opts, ai.WithConfig(config))
	}
	for _, tool := range req.Tools {
		if tool.call == nil {
			return nil, fmt.Errorf("llm: tool %q was not built with NewTool", tool.name)
		}
		opts = append(opts, ai.WithTools(toGenkitTool(tool)))
	}
	return opts, nil
}

// chatConfig is nil when the request sets nothing, so the gateway keeps its defaults.
func chatConfig(req Request) *openrouter.ChatConfig {
	if req.maxOutputTokens == 0 && !req.noReasoning {
		return nil
	}
	config := &openrouter.ChatConfig{MaxOutputTokens: req.maxOutputTokens}
	if req.noReasoning {
		config.Reasoning = &openrouter.ReasoningConfig{Effort: openrouter.ReasoningEffortNone}
	}
	return config
}

// Execute takes no output type, so the prompt is only rendered and its messages go through Generate.
func (c *genkitClient) renderPrompt(ctx context.Context, req Request) ([]*ai.Message, error) {
	if req.System != "" || req.Prompt != "" {
		return nil, fmt.Errorf("llm: prompt %q cannot be combined with System or Prompt", req.promptName)
	}
	prompt := genkit.LookupPrompt(c.genkit, req.promptName)
	if prompt == nil {
		return nil, fmt.Errorf("llm: no prompt named %q", req.promptName)
	}
	rendered, err := prompt.Render(quietGenkit(ctx), req.promptInput)
	if err != nil {
		// the cause can quote the input, which is shopper text
		return nil, fmt.Errorf("llm: render prompt %q failed", req.promptName)
	}
	return rendered.Messages, nil
}

// unregistered, so concurrent calls can use the same tool name without colliding
func toGenkitTool(tool Tool) ai.Tool {
	return ai.NewTool(tool.name, tool.description,
		func(ctx *ai.ToolContext, input any) (any, error) {
			raw, err := json.Marshal(input)
			if err != nil {
				return nil, fmt.Errorf("encode %s input: %w", tool.name, err)
			}
			return tool.call(ctx, raw)
		},
		ai.WithInputSchema(core.InferSchemaMap(tool.inputType)),
	)
}

// classify gives every error a status Retry either always or never retries.
func classify(context.Context) (*ai.Hooks, error) {
	return &ai.Hooks{
		WrapModel: func(ctx context.Context, params *ai.ModelParams, next ai.ModelNext) (*ai.ModelResponse, error) {
			delivered := false
			if callback := params.Callback; callback != nil {
				params = &ai.ModelParams{
					Request: params.Request,
					Callback: func(ctx context.Context, chunk *ai.ModelResponseChunk) error {
						delivered = true
						return callback(ctx, chunk)
					},
				}
			}

			resp, err := next(ctx, params)
			if err == nil {
				return resp, nil
			}
			// a retry after a chunk reached the caller would stream the answer twice
			if !delivered && retryable(ctx, err) {
				return nil, status.Errorf(status.ErrUnavailable, "%w", err)
			}
			return nil, status.Errorf(status.ErrFailedPrecondition, "%w", err)
		},
	}, nil
}

func retryable(ctx context.Context, err error) bool {
	if ctx.Err() != nil {
		return false
	}

	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		code := apiErr.StatusCode
		return code == http.StatusRequestTimeout || code == http.StatusTooManyRequests || code >= http.StatusInternalServerError
	}

	// a 200 the plugin could not parse, such as malformed tool arguments, would fail the same way again
	if errors.Is(err, status.ErrInvalidOutput) {
		return false
	}
	// a mid-stream gateway failure has no status line; the plugin classifies it from the error object
	if name, ok := status.Classified(err); ok {
		return slices.Contains(retryStatuses, name)
	}
	return isTransportError(err)
}

func isTransportError(err error) bool {
	var urlErr *url.Error
	var netErr net.Error
	return errors.As(err, &urlErr) || errors.As(err, &netErr) || errors.Is(err, io.ErrUnexpectedEOF)
}

// Genkit returns an unfinished answer without an error and skips schema validation on it.
func checkFinish(resp *ai.ModelResponse, req Request) error {
	switch resp.FinishReason {
	// the plugin reports a missing finish reason as unknown, along with any reason it does not recognize
	case ai.FinishReasonLength, ai.FinishReasonUnknown, ai.FinishReasonBlocked, ai.FinishReasonAborted,
		ai.FinishReasonFailed, ai.FinishReasonInterrupted, ai.FinishReasonOther:
		if req.outputType != nil {
			return fmt.Errorf("%w: generation finished %s", ErrInvalidOutput, resp.FinishReason)
		}
		return fmt.Errorf("llm: generation finished %s", resp.FinishReason)
	}
	return nil
}

func mapError(ctx context.Context, req Request, err error) error {
	switch {
	case errors.Is(err, ai.ErrToolFailed):
		return fmt.Errorf("%w: %w", ErrToolFailed, err)
	case errors.Is(err, ai.ErrMaxTurnsExceeded):
		return fmt.Errorf("llm: model asked for more than %d tool turns", maxToolTurns)
	case ctx.Err() != nil:
		// Retry returns the last attempt's error when the deadline cuts its backoff, so add ctx.Err() for errors.Is
		return fmt.Errorf("llm: %w: %s", ctx.Err(), redact(err))
	case errors.Is(err, status.ErrInvalidOutput) && req.outputType != nil:
		return fmt.Errorf("%w: %s", ErrInvalidOutput, redact(err))
	default:
		return errors.New("llm: " + redact(err))
	}
}

// redact drops gateway bodies and parse errors, which can quote the prompt or the answer.
func redact(err error) string {
	var apiErr *openai.Error
	var urlErr *url.Error
	switch {
	case errors.As(err, &apiErr):
		return fmt.Sprintf("gateway returned status %d", apiErr.StatusCode)
	case errors.Is(err, status.ErrInvalidOutput):
		return "gateway response could not be parsed"
	case errors.As(err, &urlErr):
		return urlErr.Error()
	default:
		return "gateway request failed"
	}
}

// Genkit reports only the last turn's usage, so this sums every turn.
type callUsage struct {
	inputTokens  int
	outputTokens int
	totalTokens  int
	turns        int
	cost         float64
	costReported bool
}

func (u *callUsage) middleware(context.Context) (*ai.Hooks, error) {
	return &ai.Hooks{
		WrapModel: func(ctx context.Context, params *ai.ModelParams, next ai.ModelNext) (*ai.ModelResponse, error) {
			resp, err := next(ctx, params)
			if err != nil || resp.Usage == nil {
				return resp, err
			}
			// model turns within a call are sequential, so no lock
			u.turns++
			u.inputTokens += resp.Usage.InputTokens
			u.outputTokens += resp.Usage.OutputTokens
			u.totalTokens += resp.Usage.TotalTokens
			// a :free model reports cost 0, which still counts as priced
			if cost, ok := resp.Usage.Custom["cost"]; ok {
				u.cost += cost
				u.costReported = true
			}
			return resp, nil
		},
	}, nil
}

// logCall never logs the prompt, the answer, or err, whose message can quote either.
func (c *genkitClient) logCall(ctx context.Context, usage *callUsage, start time.Time, err error) {
	attrs := []any{
		slog.String("model", c.modelID),
		slog.Int("input_tokens", usage.inputTokens),
		slog.Int("output_tokens", usage.outputTokens),
		slog.Int("total_tokens", usage.totalTokens),
		slog.Int("turns", usage.turns),
		slog.Int64("latency_ms", time.Since(start).Milliseconds()),
		slog.Bool("failed", err != nil),
	}
	if usage.costReported {
		attrs = append(attrs, slog.Float64("cost", usage.cost))
	}
	log.Debug(ctx, "llm call", attrs...)
}

// genkitStream is not safe for concurrent use; one caller reads it.
type genkitStream struct {
	ctx    context.Context
	client *genkitClient
	req    Request
	usage  *callUsage
	start  time.Time
	next   func() (*ai.ModelStreamValue, error, bool)
	stop   func()

	finished bool
	// io.EOF on success
	err      error
	response Response
}

func (s *genkitStream) Next() (string, error) {
	for !s.finished {
		value, err, ok := s.next()
		switch {
		case !ok:
			s.finish(errors.New("llm: stream ended without a final response"))
		case err != nil:
			s.finish(mapError(s.ctx, s.req, err))
		case value.Done:
			if err := checkFinish(value.Response, s.req); err != nil {
				s.finish(err)
				break
			}
			s.response = Response{Text: value.Response.Text()}
			s.finish(nil)
		default:
			if text := value.Chunk.Text(); text != "" {
				return text, nil
			}
		}
	}
	return "", s.err
}

func (s *genkitStream) Response() Response {
	return s.response
}

// Close waits for Genkit to unwind, which also closes the HTTP response.
func (s *genkitStream) Close() error {
	s.stop()
	if !s.finished {
		s.finish(errors.New("llm: stream closed before it finished"))
	}
	return nil
}

// a nil err means the stream completed
func (s *genkitStream) finish(err error) {
	s.finished = true
	s.err = io.EOF
	if err != nil {
		s.err = err
	}
	s.client.logCall(s.ctx, s.usage, s.start, err)
}

// quietGenkit silences Genkit's per-call records, which quote gateway error bodies and refusals; logCall covers the rest.
func quietGenkit(ctx context.Context) context.Context {
	return logger.WithContext(ctx, slog.New(slog.DiscardHandler))
}
