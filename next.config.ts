import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Pacotes só de servidor. `pg` / adapter Prisma nunca podem ir para o bundle do browser
   * (erro "Can't resolve 'fs'" via instrumentation → prisma).
   */
  turbopack: {},
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "pg-native",
    "bcryptjs",
    "cloudinary",
    "web-push",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        path: false,
        stream: false,
        crypto: false,
        child_process: false,
      };
    }
    return config;
  },
  allowedDevOrigins: ["*.loca.lt", "slick-toes-ask.loca.lt"],
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
      {
        source: "/agendar",
        destination: "/ze-do-corte/agendar",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
