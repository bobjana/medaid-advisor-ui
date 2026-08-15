import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal, production-ready Docker image via output file tracing.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
  output: "standalone",

  async redirects() {
    return [
      {
        source: '/',
        destination: '/chat',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
