"""Request and response bodies for the embed endpoint.

Pydantic enforces the shape and limits here. Checks that need the network or the
decoded bytes, like the public-address rule, happen in images.py.
"""

import math
from typing import Annotated, Literal

from pydantic import BaseModel, Field, HttpUrl, UrlConstraints

MAX_INPUTS = 64
MAX_IMAGE_BYTES = 10 * 1024 * 1024
# base64 turns every 3 bytes, padding the last group, into 4 characters.
MAX_IMAGE_BASE64_CHARS = 4 * math.ceil(MAX_IMAGE_BYTES / 3)


class TextInput(BaseModel):
    kind: Literal["text"]
    value: Annotated[str, Field(min_length=1)]


class ImageUrlInput(BaseModel):
    kind: Literal["image_url"]
    value: Annotated[HttpUrl, UrlConstraints(allowed_schemes=["https"])]


class ImageBase64Input(BaseModel):
    kind: Literal["image_base64"]
    value: Annotated[str, Field(min_length=1, max_length=MAX_IMAGE_BASE64_CHARS)]


EmbedInput = Annotated[
    TextInput | ImageUrlInput | ImageBase64Input, Field(discriminator="kind")
]


class EmbedRequest(BaseModel):
    inputs: Annotated[list[EmbedInput], Field(min_length=1, max_length=MAX_INPUTS)]


class EmbedResponse(BaseModel):
    """One L2-normalized 512-d vector per input, in input order."""

    embeddings: list[list[float]]
