import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    // The MCP URL holds a secret token, so keep it out of the dev server's request log.
    incomingRequests: { ignore: [/\/api\/mcp/] },
  },
};

export default nextConfig;
