/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'images.unsplash.com' },
      { hostname: 'pbs.twimg.com' },
      { hostname: 'media.licdn.com' },
    ],
  },

  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.output.uniqueName = 'social-media-orchestrator';
    return config;
  },
};

module.exports = nextConfig;
