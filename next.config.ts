import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  /**
   * Pacotes só de servidor. `pg` / adapter Prisma nunca podem ir para o bundle do browser
   * (erro "Can't resolve 'fs'" via instrumentation → prisma).
   */
  turbopack: {},
  /**
   * Upload de mídia do canvas/marca passa pelo `src/proxy.ts`. O default do Next
   * corta o body em 10 MB e o FormData quebra com "Formulário inválido."
   * Vídeo até 40 MB + overhead multipart → margem em 45 MB.
   */
  experimental: {
    proxyClientMaxBodySize: "45mb",
    serverActions: {
      bodySizeLimit: "45mb",
    },
  },
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
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
