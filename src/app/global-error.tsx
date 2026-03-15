"use client";

const TITLE = "Something went wrong";
const SUBTITLE = "A critical error occurred. Please reload the page.";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb", color: "#111827" }}>
        <main style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem", textAlign: "center" }}>
          <p style={{ fontSize: "5rem", marginBottom: "1rem" }}>💥</p>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.5rem" }}>{TITLE}</h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem", maxWidth: "28rem" }}>{SUBTITLE}</p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={reset} style={{ padding: "0.5rem 1rem", backgroundColor: "#ea580c", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontSize: "1rem" }}>
              Try Again
            </button>
            <a href="/" style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", textDecoration: "none", color: "inherit", fontSize: "1rem" }}>
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
