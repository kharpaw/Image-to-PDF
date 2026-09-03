# Image to PDF

<img width="1407" height="794" alt="Screenshot 2026-09-03 at 14 53 14" src="https://github.com/user-attachments/assets/937c9dd9-9d64-4501-94c1-164c8d20205c" />


A small web app: drop in images, reorder them, get back one PDF.

- **Backend**: Python (FastAPI + Pillow) — does the actual image → PDF conversion.
- **Frontend**: React — upload UI, drag-to-reorder thumbnails, download button.

A Flask version of the same API is also included (`backend/app_flask.py` /
`backend/requirements_flask.txt`) in case you'd rather use that instead — the
two are interchangeable from the frontend's point of view.

## 1. Run the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 5000
```

This starts the API at `http://localhost:5000`. Interactive API docs are
available at `http://localhost:5000/docs` (FastAPI generates these
automatically).

macOS note: port 5000 can be taken by the "AirPlay Receiver" system
service. If you get an "address already in use" error, either turn
AirPlay Receiver off in System Settings → General → AirDrop & Handoff,
or run on a different port with `uvicorn app:app --reload --port 5001`
(and point the frontend at that port — see below).

- `GET /health` — check it's alive
- `POST /convert` — send images (form field `images`, can repeat), get a PDF back

## 2. Run the frontend

```bash
cd frontend
npm install
npm start
```

This starts the app at `http://localhost:3000`. It talks to the backend at
`http://localhost:5000` by default. To point it elsewhere (e.g. a different
port or a deployed backend), set an environment variable before
starting/building:

```bash
REACT_APP_API_URL=https://your-api.example.com npm start
```

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
