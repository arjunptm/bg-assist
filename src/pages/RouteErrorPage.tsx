import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Shell } from "../components/Shell";

export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <Shell>
      <section className="card error-card route-error" role="alert">
        <p className="eyebrow">{notFound ? "Page not found" : "Something went wrong"}</p>
        <h1>{notFound ? "That page isn't on the table." : "BG Assistant hit an unexpected error."}</h1>
        <p className="muted">
          {notFound
            ? "The link may be incomplete or no longer available."
            : "Reload the page to try again. Your shared game library has not been changed."}
        </p>
        <div className="button-row">
          {!notFound && (
            <button className="button button--primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
          )}
          <Link className="button button--secondary" to="/">Return home</Link>
        </div>
      </section>
    </Shell>
  );
}
