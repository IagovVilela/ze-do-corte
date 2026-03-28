import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Turbopack pode copiar um `@prisma/client` antigo para `.next/dev/node_modules` após `prisma generate`,
   * gerando "Unknown field" em runtime. Externalizar força o uso do cliente em `node_modules`.
   */
  serverExternalPackages: ["@prisma/client", "bcryptjs", "cloudinary"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/admin/equipa",
        destination: "/admin/equipe",
        permanent: true,
      },
      {
        source: "/sign-in",
        destination: "/admin/login",
        permanent: false,
      },
      {
        source: "/sign-in/:path*",
        destination: "/admin/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
