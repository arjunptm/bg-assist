import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Shell({
  children,
  backTo,
  backLabel = "Back"
}: {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          {backTo ? (
            <Link className="back-link" to={backTo} aria-label={backLabel}>
              ←
            </Link>
          ) : (
            <span className="brand-mark" aria-hidden="true">BG</span>
          )}
          <Link className="wordmark" to="/">BG Assistant</Link>
        </div>
      </header>
      <main className="shell">{children}</main>
    </>
  );
}

export function LoadingCard({ message = "Setting up the table…" }: { message?: string }) {
  return <div className="card status-card" role="status">{message}</div>;
}

export function EmptyState({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__dice" aria-hidden="true">⚄</span>
      <h2>{title}</h2>
      <div className="muted">{children}</div>
    </div>
  );
}

