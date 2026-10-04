import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: { "/**": ["./supabase-ca.crt"] },
};
export default config;
