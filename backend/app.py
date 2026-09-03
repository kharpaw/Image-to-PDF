"""


Run locally:
    pip install -r requirements.txt
    uvicorn app:app --reload --port 5000
"""

import io
from typing import List

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ImageOps

app = FastAPI(title="Image to PDF API")

# Allow the React dev server (different port) to call this API.
# Restrict allow_origins to your real frontend domain before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"}
MAX_FILE_SIZE_MB = 20
MAX_TOTAL_SIZE_MB = 50


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def fit_to_a4(img: Image.Image) -> Image.Image:
    """Place the image, centered, onto a white A4-proportioned canvas at 150 DPI."""
    a4_px = (1654, 2339)  # A4 at 150 DPI
    canvas = Image.new("RGB", a4_px, (255, 255, 255))

    ratio = min(a4_px[0] / img.width, a4_px[1] / img.height)
    new_size = (max(1, int(img.width * ratio)), max(1, int(img.height * ratio)))
    resized = img.resize(new_size, Image.LANCZOS)

    offset = ((a4_px[0] - new_size[0]) // 2, (a4_px[1] - new_size[1]) // 2)
    canvas.paste(resized, offset)
    return canvas


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/convert")
async def convert_images_to_pdf(
    images: List[UploadFile] = File(...),
    page_size: str = Form("fit"),
):
    """
    Accepts one or more image files under the "images" field (order is
    preserved in the output PDF) and an optional "page_size" form field:
    "fit" (default, each page matches its image) or "a4".
    """
    if not images:
        raise HTTPException(status_code=400, detail="No images were sent.")

    total_bytes = 0
    pil_images = []

    for upload in images:
        if not upload.filename or not allowed_file(upload.filename):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {upload.filename}",
            )

        raw = await upload.read()
        total_bytes += len(raw)

        if len(raw) > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"{upload.filename} is larger than {MAX_FILE_SIZE_MB}MB.",
            )
        if total_bytes > MAX_TOTAL_SIZE_MB * 1024 * 1024:
            return HTTPException(
                status_code=400,
                detail=f"Total upload exceeds {MAX_TOTAL_SIZE_MB}MB.",
            )

        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Could not read image: {upload.filename}",
            )

        # Correct orientation based on EXIF data (common issue with phone photos)
        img = ImageOps.exif_transpose(img)

        # PDF pages need RGB (no alpha channel, no palette mode)
        if img.mode in ("RGBA", "P", "LA"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        if page_size == "a4":
            img = fit_to_a4(img)

        pil_images.append(img)

    if not pil_images:
        raise HTTPException(status_code=400, detail="No valid images to convert.")

    pdf_buffer = io.BytesIO()
    first_image, remaining_images = pil_images[0], pil_images[1:]
    first_image.save(
        pdf_buffer,
        format="PDF",
        save_all=True,
        append_images=remaining_images,
        resolution=200.0,
        quality=100, 
    )
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=converted.pdf"},
    )
