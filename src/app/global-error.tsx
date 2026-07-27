"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b0e15",
          color: "#e8eaed",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9CA3AF",
            }}
          >
            Barbernegon
          </p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 28, fontWeight: 700 }}>
            Algo deu errado
          </h1>
          <p style={{ margin: "0 0 24px", color: "#c2c6d6", lineHeight: 1.5 }}>
            Já registramos o erro. Tente de novo ou volte mais tarde.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 8,
              background: "#3B82F6",
              color: "#fff",
              fontWeight: 600,
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
