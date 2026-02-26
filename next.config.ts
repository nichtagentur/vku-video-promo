import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Only apply COOP/COEP on editor pages where ffmpeg.wasm is used
        source: "/editor/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.kommunaldigital.de',
      },
      {
        protocol: 'https',
        hostname: 'kommunaldigital.de',
      },
    ],
  },
};

export default nextConfig;
