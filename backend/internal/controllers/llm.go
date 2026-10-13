package controllers

import (
	"context"
	"errors"
	"io"
	"time"

	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/log"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/sse"
)

const devCallTimeout = 60 * time.Second

type LLMController struct {
	llm             llm.Client
	currentTimeTool llm.Tool
}

func NewLLMController(client llm.Client) *LLMController {
	return &LLMController{
		llm: client,
		currentTimeTool: llm.NewTool("current_time", "Returns the current time in UTC, in RFC 3339 format.",
			func(context.Context, struct{}) (string, error) {
				return time.Now().UTC().Format(time.RFC3339), nil
			}),
	}
}

type LLMGenerateInput struct {
	Body struct {
		Prompt  string `json:"prompt" required:"true" minLength:"1" maxLength:"4000"`
		System  string `json:"system,omitempty" maxLength:"4000"`
		UseTool bool   `json:"use_tool,omitempty" doc:"Offer the model a current_time tool."`
	}
}

type LLMGenerateOutput struct {
	Body struct {
		Text string `json:"text"`
	}
}

type LLMStructuredInput struct {
	Body struct {
		Prompt string `json:"prompt" required:"true" minLength:"1" maxLength:"4000"`
	}
}

type LLMOutfitIdea struct {
	Occasion string   `json:"occasion"`
	Pieces   []string `json:"pieces"`
	Why      string   `json:"why"`
}

type LLMStructuredOutput struct {
	Body LLMOutfitIdea
}

type LLMStreamChunk struct {
	Text string `json:"text"`
}

type LLMStreamDone struct{}

type LLMStreamError struct {
	Message string `json:"message"`
}

const outfitIdeaSystem = "Suggest one outfit for the occasion the user describes. " +
	"Name the occasion, list the pieces, and give one short sentence on why they work together."

func (c *LLMController) Generate(ctx context.Context, input *LLMGenerateInput) (*LLMGenerateOutput, error) {
	ctx, cancel := context.WithTimeout(ctx, devCallTimeout)
	defer cancel()

	resp, err := c.llm.Generate(ctx, c.buildRequest(input))
	if err != nil {
		log.Error(ctx, "llm dev generate failed", "error", err)
		return nil, huma.Error502BadGateway("llm unavailable")
	}

	out := &LLMGenerateOutput{}
	out.Body.Text = resp.Text
	return out, nil
}

func (c *LLMController) GenerateStructured(ctx context.Context, input *LLMStructuredInput) (*LLMStructuredOutput, error) {
	ctx, cancel := context.WithTimeout(ctx, devCallTimeout)
	defer cancel()

	idea, err := llm.Generate[LLMOutfitIdea](ctx, c.llm, llm.Request{System: outfitIdeaSystem, Prompt: input.Body.Prompt})
	if err != nil {
		log.Error(ctx, "llm dev structured generate failed", "error", err)
		return nil, huma.Error502BadGateway("llm unavailable")
	}
	return &LLMStructuredOutput{Body: idea}, nil
}

// Stream reports failures as an error event because the 200 has already been sent.
func (c *LLMController) Stream(ctx context.Context, input *LLMGenerateInput, send sse.Sender) {
	ctx, cancel := context.WithTimeout(ctx, devCallTimeout)
	defer cancel()

	reader, err := c.llm.GenerateStream(ctx, c.buildRequest(input))
	if err != nil {
		c.streamFailed(ctx, send, err)
		return
	}
	defer func() { _ = reader.Close() }()

	for {
		chunk, err := reader.Next()
		if errors.Is(err, io.EOF) {
			_ = send.Data(LLMStreamDone{})
			return
		}
		if err != nil {
			c.streamFailed(ctx, send, err)
			return
		}
		// A failed send means the browser went away; the deferred Close stops the model.
		if err := send.Data(LLMStreamChunk{Text: chunk}); err != nil {
			return
		}
	}
}

func (c *LLMController) streamFailed(ctx context.Context, send sse.Sender, err error) {
	log.Error(ctx, "llm dev stream failed", "error", err)
	_ = send.Data(LLMStreamError{Message: "llm unavailable"})
}

func (c *LLMController) buildRequest(input *LLMGenerateInput) llm.Request {
	req := llm.Request{System: input.Body.System, Prompt: input.Body.Prompt}
	if input.Body.UseTool {
		req.Tools = []llm.Tool{c.currentTimeTool}
	}
	return req
}
