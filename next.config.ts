import type { NextConfig } from "next";
import { getSupabaseStorageHostname } from "@/lib/destination-storage";

const supabaseHost = getSupabaseStorageHostname();

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: supabaseHost
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
};

export default nextConfig;
