"""Tests for image upload validation (magic-byte checks)."""
import io

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from app.core.upload_validation import validate_image_upload


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "pink").save(buf, format="PNG")
    return buf.getvalue()


def _upload(data: bytes, filename: str) -> UploadFile:
    return UploadFile(file=io.BytesIO(data), filename=filename)


def test_valid_png_passes():
    # Should not raise; stream is left rewound for the caller.
    upload = _upload(_png_bytes(), "photo.png")
    validate_image_upload(upload)
    assert upload.file.tell() == 0


def test_rejects_disallowed_extension():
    with pytest.raises(HTTPException) as exc:
        validate_image_upload(_upload(b"<svg xmlns='...'></svg>", "evil.svg"))
    assert exc.value.status_code == 400


def test_rejects_non_image_with_image_extension():
    # Script bytes renamed to .png must fail the magic-byte check (stored-XSS).
    payload = b"<html><script>alert(1)</script></html>"
    with pytest.raises(HTTPException) as exc:
        validate_image_upload(_upload(payload, "evil.png"))
    assert exc.value.status_code == 400


def test_rejects_empty_file():
    with pytest.raises(HTTPException):
        validate_image_upload(_upload(b"", "empty.png"))
