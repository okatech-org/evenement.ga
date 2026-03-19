"use client";

// ─── Device Preview Frame ─────────────────────────────────
// Renders children inside a realistic phone/tablet frame
// Uses CSS transform: scale() to render content at full device
// resolution and then visually shrink it so text appears at
// the correct mobile proportions.

export interface DevicePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: string;
  notchWidth: number;
  borderRadius: string;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: "iphone-se", label: "iPhone SE", width: 375, height: 667, icon: "📱", notchWidth: 100, borderRadius: "2rem" },
  { id: "iphone-14", label: "iPhone 14", width: 390, height: 844, icon: "📱", notchWidth: 112, borderRadius: "2.5rem" },
  { id: "iphone-15-pro", label: "iPhone 15 Pro Max", width: 430, height: 932, icon: "📱", notchWidth: 120, borderRadius: "3rem" },
  { id: "ipad", label: "iPad", width: 768, height: 1024, icon: "📋", notchWidth: 0, borderRadius: "1.5rem" },
];

interface DevicePreviewFrameProps {
  device: DevicePreset;
  children: React.ReactNode;
  scale?: number;
}

export function DevicePreviewFrame({ device, children, scale }: DevicePreviewFrameProps) {
  const s = scale ?? 1;
  const isIPad = device.id === "ipad";

  // Outer container is the VISUAL size (scaled down)
  const frameW = device.width * s;
  const frameH = device.height * s;
  const bezelPx = 6;

  // Scale the notch/status bar elements proportionally
  const notchScale = s;

  return (
    <div
      className="relative flex-shrink-0 transition-all duration-500 ease-out"
      style={{ width: frameW + bezelPx * 2, height: frameH + bezelPx * 2 }}
    >
      {/* Bezel / outer shadow */}
      <div
        className="absolute inset-0 bg-gray-900/5 dark:bg-white/5 shadow-2xl"
        style={{
          borderRadius: `calc(${device.borderRadius} * ${s} + ${bezelPx}px)`,
          padding: bezelPx,
        }}
      >
        {/* Screen area — clips content */}
        <div
          className="relative w-full h-full overflow-hidden bg-white"
          style={{ borderRadius: `calc(${device.borderRadius} * ${s})` }}
        >
          {/* ── Dynamic Island / Notch ── */}
          {device.notchWidth > 0 && (
            <div
              className="absolute top-0 inset-x-0 z-50 flex justify-center pointer-events-none"
              style={{ paddingTop: 8 * notchScale }}
            >
              <div
                className="bg-black rounded-full"
                style={{
                  width: device.notchWidth * notchScale,
                  height: 22 * notchScale,
                }}
              />
            </div>
          )}

          {/* ── Status bar ── */}
          {!isIPad && (
            <div
              className="absolute top-0 inset-x-0 z-40 flex items-center justify-between pointer-events-none"
              style={{ padding: `${4 * notchScale}px ${20 * notchScale}px 0` }}
            >
              <span
                className="font-semibold text-white mix-blend-difference"
                style={{ fontSize: 10 * notchScale }}
              >
                9:41
              </span>
              <div className="flex items-center" style={{ gap: 3 * notchScale }}>
                <svg
                  className="text-white mix-blend-difference"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{ width: 10 * notchScale, height: 10 * notchScale }}
                >
                  <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
                </svg>
                <svg
                  className="text-white mix-blend-difference"
                  fill="currentColor"
                  viewBox="0 0 25 12"
                  style={{ width: 14 * notchScale, height: 8 * notchScale }}
                >
                  <rect x="0" y="1" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
                  <rect x="2" y="3" width="14" height="6" rx="1" fill="currentColor" />
                  <path d="M22 5v2a1 1 0 001-1v0a1 1 0 00-1-1z" fill="currentColor" opacity="0.4" />
                </svg>
              </div>
            </div>
          )}

          {/* ── Content — rendered at FULL device dimensions, then CSS-scaled ── */}
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={{
              width: device.width,
              height: device.height,
              transform: `scale(${s})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>

          {/* ── Home indicator ── */}
          {!isIPad && (
            <div
              className="absolute bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none"
              style={{ paddingBottom: 6 * notchScale }}
            >
              <div
                className="bg-black/20 dark:bg-white/30 rounded-full"
                style={{
                  width: 120 * notchScale,
                  height: 4 * notchScale,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
