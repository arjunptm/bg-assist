import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

function isShareCancellation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export function ShareGroup({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState("");
  const [feedback, setFeedback] = useState("");
  const linkRef = useRef<HTMLInputElement>(null);
  const url = window.location.href;

  useEffect(() => {
    if (!open) return;
    let active = true;
    setQr("");
    setQrError("");
    void QRCode.toDataURL(url, { width: 320, margin: 2 })
      .then((dataUrl) => {
        if (active) setQr(dataUrl);
      })
      .catch(() => {
        if (active) setQrError("The QR code could not be created. You can still share the link below.");
      });
    linkRef.current?.focus();
    linkRef.current?.select();
    return () => {
      active = false;
    };
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function openFallback(message = "") {
    setFeedback(message);
    setOpen(true);
  }

  async function share() {
    if (!navigator.share) {
      openFallback("Choose a sharing option below.");
      return;
    }
    try {
      await navigator.share({ title: `${name} · Game Night`, url });
    } catch (error) {
      if (!isShareCancellation(error)) {
        openFallback("Native sharing was unavailable. Choose another option below.");
      }
    }
  }

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setFeedback("Group link copied.");
    } catch {
      linkRef.current?.focus();
      linkRef.current?.select();
      setFeedback("Automatic copy is unavailable. Copy the selected link manually.");
    }
  }

  return (
    <>
      <button className="button button--secondary button--small" onClick={() => void share()}>
        Share group
      </button>
      <button className="icon-button" onClick={() => openFallback()} aria-label="Show group QR code">
        QR
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-heading"
            aria-describedby="share-warning"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            <p className="eyebrow">Private by link</p>
            <h2 id="share-heading">Join {name}</h2>
            {qr && <img className="qr" src={qr} alt={`QR code for ${name}`} />}
            {qrError && <p className="error" role="alert">{qrError}</p>}
            <label className="share-link">
              <span>Group link</span>
              <input
                ref={linkRef}
                readOnly
                value={url}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
              />
            </label>
            <button
              className="button button--primary button--full"
              onClick={() => void copyLink()}
            >
              Copy group link
            </button>
            {feedback && <p className="share-feedback" role="status">{feedback}</p>}
            <p className="fine-print" id="share-warning">
              Anyone with this link can view and edit the game library.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
