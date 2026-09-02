import { useState, useRef, useCallback } from "react";
import "./App.css";

// Point this at your Flask backend
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

let nextId = 1;

export default function App() {
  const [items, setItems] = useState([]); // { id, file, previewUrl }
  const [pageSize, setPageSize] = useState("fit");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | converting | done | error
  const [errorMessage, setErrorMessage] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const dragIndex = useRef(null);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/")
    );
    if (incoming.length === 0) return;

    const newItems = incoming.map((file) => ({
      id: nextId++,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setItems((prev) => [...prev, ...newItems]);
    setStatus("idle");
    setPdfUrl(null);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleRemove = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setPdfUrl(null);
    setStatus("idle");
  };

  const handleReorderStart = (index) => {
    dragIndex.current = index;
  };

  const handleReorderOver = (index) => {
    if (dragIndex.current === null || dragIndex.current === index) return;
    setItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex.current, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    dragIndex.current = index;
  };

  const handleConvert = async () => {
    if (items.length === 0) return;
    setStatus("converting");
    setErrorMessage("");
    setPdfUrl(null);

    const formData = new FormData();
    items.forEach((item) => formData.append("images", item.file));
    formData.append("page_size", pageSize);

    try {
      const response = await fetch(`${API_URL}/convert`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Conversion failed. Try again.");
      }

      const blob = await response.blob();
      setPdfUrl(URL.createObjectURL(blob));
      setStatus("done");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  const resetAll = () => {
    setItems([]);
    setPdfUrl(null);
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="page">
      <header className="hero">
        <p className="hero-kicker">Image → PDF</p>
        <h1>
          Stack your photos.
          <br />
          Walk away with one PDF.
        </h1>
        <p className="hero-sub">
          Drop in a handful of images, put them in order, and get back a
          single document — nothing installed, nothing uploaded anywhere
          permanent.
        </p>
      </header>

      <section
        className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="dropzone-glyph" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="40" height="40">
            <path
              d="M24 6v24m0-24 9 9m-9-9-9 9"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 30v8a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4v-8"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="dropzone-title">Drop images here</p>
        <p className="dropzone-sub">or click to browse — JPG, PNG, WEBP, HEIC</p>
      </section>

      {items.length > 0 && (
        <section className="stack-panel">
          <div className="stack-panel-head">
            <h2>
              {items.length} page{items.length > 1 ? "s" : ""}, in order
            </h2>
            <button className="text-button" onClick={resetAll}>
              Clear all
            </button>
          </div>

          <ol className="filmstrip">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="thumb"
                draggable
                onDragStart={() => handleReorderStart(index)}
                onDragEnter={() => handleReorderOver(index)}
                onDragEnd={() => (dragIndex.current = null)}
              >
                <span className="thumb-index">{index + 1}</span>
                <img src={item.previewUrl} alt={`Page ${index + 1}`} />
                <button
                  className="thumb-remove"
                  aria-label={`Remove page ${index + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>

          <div className="controls-row">
            <fieldset className="page-size-toggle">
              <legend>Page size</legend>
              <label>
                <input
                  type="radio"
                  name="page-size"
                  value="fit"
                  checked={pageSize === "fit"}
                  onChange={() => setPageSize("fit")}
                />
                Fit to each image
              </label>
              <label>
                <input
                  type="radio"
                  name="page-size"
                  value="a4"
                  checked={pageSize === "a4"}
                  onChange={() => setPageSize("a4")}
                />
                A4, centered
              </label>
            </fieldset>

            <button
              className="convert-button"
              onClick={handleConvert}
              disabled={status === "converting"}
            >
              {status === "converting" ? "Building your PDF…" : "Convert to PDF"}
            </button>
          </div>

          {status === "error" && (
            <p className="error-text">{errorMessage}</p>
          )}

          {status === "done" && pdfUrl && (
            <div className="result-card">
              <div>
                <p className="result-title">Your PDF is ready</p>
                <p className="result-sub">{items.length} page document</p>
              </div>
              <a className="download-button" href={pdfUrl} download="converted.pdf">
                Download PDF
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
