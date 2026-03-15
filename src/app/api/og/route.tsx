import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const APP_NAME = "March Madness Picker";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || APP_NAME;
  const subtitle = searchParams.get("subtitle") || "Fill out your bracket and compete with friends";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 16 }}>🏀</div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#f97316",
            textAlign: "center",
            maxWidth: "80%",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#94a3b8",
            marginTop: 16,
            textAlign: "center",
            maxWidth: "70%",
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
