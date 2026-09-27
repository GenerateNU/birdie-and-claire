"""Turns image inputs into RGB images, fetching URLs with SSRF, size, and time limits."""

import base64
import io
import ipaddress
import socket
import struct
import time

import httpx
from fastapi import HTTPException
from PIL import Image
from pydantic import HttpUrl

from app.schemas import MAX_IMAGE_BYTES, ImageBase64Input, ImageUrlInput

FETCH_TIMEOUT_SECONDS = 10


def load_image(index: int, item: ImageUrlInput | ImageBase64Input) -> Image.Image:
    """Decode one image input, or raise a 422 naming `inputs[index]`."""
    try:
        match item:
            case ImageUrlInput():
                data = fetch_image(item.value)
            case ImageBase64Input():
                data = base64.b64decode(item.value, validate=True)
        return Image.open(io.BytesIO(data)).convert("RGB")
    except (
        ValueError,
        OSError,
        struct.error,
        httpx.HTTPError,
        Image.DecompressionBombError,
    ) as error:
        raise HTTPException(status_code=422, detail=f"inputs[{index}]: {error}") from error


def fetch_image(url: HttpUrl) -> bytes:
    for *_, sockaddr in socket.getaddrinfo(url.host, url.port):
        if not ipaddress.ip_address(sockaddr[0]).is_global:
            raise ValueError("URL resolves to a non-public address")

    # A redirect could point at a private address the check above never saw.
    # The httpx timeout applies per read, so the deadline caps the whole transfer.
    deadline = time.monotonic() + FETCH_TIMEOUT_SECONDS
    with httpx.stream(
        "GET", str(url), timeout=FETCH_TIMEOUT_SECONDS, follow_redirects=False
    ) as response:
        response.raise_for_status()
        data = bytearray()
        for chunk in response.iter_bytes():
            data.extend(chunk)
            if len(data) > MAX_IMAGE_BYTES:
                raise ValueError(f"image is larger than {MAX_IMAGE_BYTES} bytes")
            if time.monotonic() > deadline:
                raise ValueError(f"image took longer than {FETCH_TIMEOUT_SECONDS}s")
    return bytes(data)
