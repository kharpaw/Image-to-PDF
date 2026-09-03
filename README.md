# Image to PDF

<img width="1407" height="794" alt="Screenshot 2026-09-03 at 14 53 14" src="https://github.com/user-attachments/assets/937c9dd9-9d64-4501-94c1-164c8d20205c" />


A small web app: drop in images, reorder them, get back one PDF.

## How it works

1. You drop or pick image files in the browser.
2. Drag thumbnails to put them in the order you want; the number badge
   shows page order.
3. Choose whether each page should be sized to fit its image, or centered
   on a standard A4 page.
4. Clicking **Convert to PDF** sends all the images to the backend in one
   request; Pillow opens each one, fixes rotation from phone photos
   (EXIF), and writes them into a single multi-page PDF.
5. The PDF comes back as a file download — nothing is stored on the
   server after the request finishes.

## Notes for production

- The backend currently allows any origin (`allow_origins=["*"]`);
  restrict this to your real frontend domain before deploying.
- Uploads are capped at 20MB per file / 50MB total
