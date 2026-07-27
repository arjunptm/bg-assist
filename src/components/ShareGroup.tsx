import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function ShareGroup({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const url = window.location.href;

  useEffect(() => {
    if (open) void QRCode.toDataURL(url, { width: 320, margin: 2 }).then(setQr);
  }, [open, url]);

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: `${name} · BG Assistant`, url });
    } else {
      await navigator.clipboard.writeText(url);
      setOpen(true);
    }
  }

  return (
    <>
      <button className="button button--secondary button--small" onClick={() => void share()}>
        Share group
      </button>
      <button className="icon-button" onClick={() => setOpen(true)} aria-label="Show group QR code">
        QR
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            <p className="eyebrow">Private by link</p>
            <h2 id="share-heading">Join {name}</h2>
            {qr && <img className="qr" src={qr} alt={`QR code for ${name}`} />}
            <button
              className="button button--primary button--full"
              onClick={() => void navigator.clipboard.writeText(url)}
            >
              Copy group link
            </button>
            <p className="fine-print">Anyone with this link can view and edit the game library.</p>
          </section>
        </div>
      )}
    </>
  );
}

