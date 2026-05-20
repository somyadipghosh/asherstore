import type { NextConfig } from "next";

const resolvedEndpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";

const endpointUrl = (() => {
  try {
    return new URL(resolvedEndpoint);
  } catch {
    return new URL("https://nyc.cloud.appwrite.io/v1");
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "example.com"
      },
      {
        protocol: endpointUrl.protocol.replace(":", "") as "http" | "https",
        hostname: endpointUrl.hostname
      }
    ]
  },
  async headers() {
    return [
      {
        // Apply to every route.
        source: "/(.*)",
        headers: [
          {
            // Only allow fonts from our own origin.
            // This definitively blocks browser-level requests to
            // assets.appwrite.io before any CORS check can occur.
            key: "Content-Security-Policy",
            value: "font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
