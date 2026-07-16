"""
Upload validation helpers.

Validates image uploads by extension, size, and — critically — real content
(magic bytes via Pillow), rejecting files whose bytes are not a genuine raster
image. This closes the stored-XSS vector where an ``image/svg+xml`` or HTML
file with an image-y Content-Type header could be served from /uploads and
execute as script in the site's origin.
"""
import io
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

# Raster formats only — deliberately excludes SVG (which can carry script).
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_image_upload(file: UploadFile) -> None:
    """Validate an uploaded image, raising HTTPException(400) on any problem.

    Checks the extension against an allowlist, enforces the size cap, and
    verifies the actual bytes are a valid image of an allowed format (not just
    a trusted Content-Type header). Leaves the file stream rewound to the start
    so the caller can hand it straight to storage.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type '{ext or 'unknown'}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
            ),
        )

    data = file.file.read()
    file.file.seek(0)

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
        )
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed size of 10MB",
        )

    # Verify real image content via magic bytes. Import Pillow lazily so the
    # module imports even where Pillow isn't installed (it's a hard dep in prod).
    try:
        from PIL import Image

        image = Image.open(io.BytesIO(data))
        image_format = (image.format or "").upper()
        image.verify()  # validates structure; image is unusable afterwards
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a valid image",
        )

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported image format '{image_format or 'unknown'}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_IMAGE_FORMATS))}"
            ),
        )
