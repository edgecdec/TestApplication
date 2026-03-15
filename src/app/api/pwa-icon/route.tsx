import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const VALID_SIZES = [192, 512] as const;
type IconSize = (typeof VALID_SIZES)[number];

function isValidSize(n: number): n is IconSize {
  return (VALID_SIZES as readonly number[]).includes(n);
}

export async function GET(req: NextRequest) {
  const sizeParam = Number(req.nextUrl.searchParams.get("size") || "192");
  const size = isValidSize(sizeParam) ? sizeParam : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f97316",
          borderRadius: size * 0.2,
        }}
      >
        <svg
          viewBox="0 0 32 32"
          width={size * 0.7}
          height={size * 0.7}
        >
          <circle cx="16" cy="16" r="15" fill="#f97316" />
          <path
            d="M6 16h20M16 6v20M8.5 8.5Q16 13 23.5 8.5M8.5 23.5Q16 19 23.5 23.5"
            stroke="#7c2d12"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
