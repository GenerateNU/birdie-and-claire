"""FashionCLIP text and image embeddings behind one proxy-authenticated Modal web app."""

import threading

import modal
from fastapi import FastAPI

from app.images import load_image
from app.schemas import (
    EmbedRequest,
    EmbedResponse,
    ImageBase64Input,
    ImageUrlInput,
    TextInput,
)

MODEL_ID = "patrickjohncyh/fashion-clip"
CLIP_MAX_TOKENS = 77  # limit for this model

container_image = (
    modal.Image.debian_slim(python_version="3.13")
    .uv_sync()
    .env({"HF_HOME": "/models"})
    .run_commands(
        f"hf download {MODEL_ID} --exclude 'onnx/*' --exclude 'pytorch_model.bin'"
    )
    .env({"HF_HUB_OFFLINE": "1"})
    .add_local_python_source("app")
)
app = modal.App("birdie-and-claire-embedder", image=container_image)

with container_image.imports():
    import torch
    from PIL import Image
    from transformers import CLIPModel, CLIPProcessor


def normalize(features: torch.Tensor) -> list[list[float]]:
    return torch.nn.functional.normalize(features, dim=-1).tolist()


@app.cls(cpu=2.0, memory=2048, max_containers=2)
@modal.concurrent(max_inputs=4)
class Embedder:
    @modal.enter()
    def load(self) -> None:
        self.model = CLIPModel.from_pretrained(MODEL_ID).eval()
        self.processor = CLIPProcessor.from_pretrained(MODEL_ID)
        # Concurrent inputs run on threads, and a shared fast tokenizer is not
        # thread-safe. Image fetching stays outside the lock so it can overlap.
        self.inference_lock = threading.Lock()

    @modal.asgi_app(requires_proxy_auth=True)
    def web(self) -> FastAPI:
        web_app = FastAPI()

        @web_app.post("/embed")
        def embed(request: EmbedRequest) -> EmbedResponse:
            return self.embed(request)

        @web_app.get("/warm", status_code=204)
        def warm() -> None:
            """Starts a container and loads the model ahead of the first embed."""

        return web_app

    def embed(self, request: EmbedRequest) -> EmbedResponse:
        text_indexes: list[int] = []
        texts: list[str] = []
        image_indexes: list[int] = []
        images: list[Image.Image] = []
        for index, item in enumerate(request.inputs):
            match item:
                case TextInput():
                    text_indexes.append(index)
                    texts.append(item.value)
                case ImageUrlInput() | ImageBase64Input():
                    image_indexes.append(index)
                    images.append(load_image(index, item))

        vectors_by_index: dict[int, list[float]] = {}
        with self.inference_lock, torch.inference_mode():
            if texts:
                batch = self.processor(
                    text=texts,
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                    max_length=CLIP_MAX_TOKENS,
                )
                features = self.model.get_text_features(**batch).pooler_output
                vectors_by_index.update(
                    zip(text_indexes, normalize(features), strict=True)
                )
            if images:
                batch = self.processor(images=images, return_tensors="pt")
                features = self.model.get_image_features(**batch).pooler_output
                vectors_by_index.update(
                    zip(image_indexes, normalize(features), strict=True)
                )

        return EmbedResponse(
            embeddings=[vectors_by_index[index] for index in range(len(request.inputs))]
        )
