# Embedder

We're using [FashionCLIP](https://huggingface.co/patrickjohncyh/fashion-clip) deployed on Modal.
`POST /embed` turns text and images into 512-d vectors in the same space, so a
query like "clothes for a wedding" can be compared directly against product
photos. `GET /warm` starts a container ahead of time.


## First-time setup
> [!CAUTION]
> These steps are not needed for development as we are using proxy tokens and the model is already deployed on Modal

1. Install the pinned tools and the project's dependencies. `setup` creates
   `ml/embedder/.venv` from `uv.lock` along with the rest of the repo. If you change dependencies, run `uv sync` in `ml/embedder`.

2. Link the Modal CLI to your account. This opens a browser and writes a token
   to `~/.modal.toml`, which every project on the machine then uses:

   ```sh
   cd ml/embedder
   uv run modal setup
   ```

3. Create the Modal environment for this app. This is a one-time
   step per workspace + skip if the environment already exists:

   ```sh
   uv run modal environment create birdie-and-claire
   ```

4. Create a proxy auth token in the Modal dashboard under Settings, Proxy Auth
   Tokens. The endpoint rejects any request without one. Keep the token ID and
   secret; callers send them as the `Modal-Key` and `Modal-Secret` headers.

## Calling it

```sh
curl -X POST "$EMBEDDER_URL/embed" \
  -H "Modal-Key: $MODAL_PROXY_KEY" \
  -H "Modal-Secret: $MODAL_PROXY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {"kind": "text", "value": "red silk dress"},
      {"kind": "image_url", "value": "https://example.com/dress.jpg"},
      {"kind": "image_base64", "value": "<base64 image bytes, no data: prefix>"}
    ]
  }'
```

```json
{ "embeddings": [[0.012, -0.034, ...], [...], [...]] }
```

- It returns one vector per input, in input order. 
- Vectors are L2-normalized, so cosine similarity is just dot product.
- A request takes 1 to 64 inputs. 
- Images can be up to 10 MB. 
  - Image URLs must be `https` and resolve to a public address, and redirects are not followed. 
- Any
invalid input fails the whole request with a 422 whose detail names the input,
  - for example `inputs[2]: ...`.

### Warming up

Call this when a user opens a page that will embed something soon. It returns
204 once a container is up and the model is loaded, and that container then
stays warm for 60 seconds.

```sh
curl "$EMBEDDER_URL/warm" \
  -H "Modal-Key: $MODAL_PROXY_KEY" \
  -H "Modal-Secret: $MODAL_PROXY_SECRET"
```
