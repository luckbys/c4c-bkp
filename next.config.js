/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configurações para resolver problemas de fast refresh
  experimental: {
    esmExternals: 'loose',
    serverComponentsExternalPackages: ['ioredis'],
  },
  // Configurações de desenvolvimento
  reactStrictMode: false, // Desabilitar strict mode para evitar double renders
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fallbacks para módulos Node.js no lado do cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
      };
    }
    
    // Externals para ioredis no lado do servidor
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        ioredis: 'commonjs ioredis',
      });
    }
    
    return config;
  },
};

export default nextConfig;
