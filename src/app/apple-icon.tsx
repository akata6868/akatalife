import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
          borderRadius: "40px",
          color: "#ffffff",
          fontSize: 88,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        AL
      </div>
    ),
    {
      ...size,
    }
  );
}
