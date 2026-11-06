import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    // MCP URLs and client links hold secret tokens, so keep them out of the dev server's request log.
    incomingRequests: { ignore: [/\/api\/mcp/, /\/c\//] },
  },
  async headers() {
    return [
      {
        // Client links are private: never index them, and never pass the link on to other sites.
        source: "/c/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
