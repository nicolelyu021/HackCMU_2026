import type { NextConfig } from 'next';

// Owner A. Workspace packages export TypeScript source, so Next compiles them (docs/ARCHITECTURE.md "no build step").
const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ['@pinlog/schema', '@pinlog/video'],
  // One React copy is enforced by pnpm overrides; nothing else to alias.
};

export default nextConfig;
