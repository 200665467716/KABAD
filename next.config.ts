import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/** "https://rt.kabad.app" → "https://rt.kabad.app wss://rt.kabad.app": sockets need the ws(s) form too. */
function withSocket(url: string | undefined) {
  if (!url) return [];
  try {
    const u = new URL(url);
    const ws = u.protocol === "https:" ? "wss:" : "ws:";
    return [u.origin, `${ws}//${u.host}`];
  } catch {
    return [];
  }
}

// Partial prerendering rules out nonces, so inline scripts stay allowed; everything else is locked down:
// where the page may connect, frame embedding, plugins, base and form targets.
const connect = ["'self'", ...withSocket(process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4001"), ...withSocket(process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://localhost:7880")];
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  `connect-src ${connect.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // The microphone is needed by the voice rooms, on this site only.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Self-contained server for the Systalink VPS (Docker image built in CI, never on the server).
  output: "standalone",
  poweredByHeader: false,
  // Image optimisation needs sharp, whose libvips is LGPL and banned by the CADEV rules.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
