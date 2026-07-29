/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@upstash/ratelimit', '@upstash/redis', 'pdf-parse', 'pdf-to-img', 'pdfjs-dist'],
  },
  webpack: (config, { dev }) => {
    // 禁用 webpack 持久化缓存，防止 __webpack_modules__[moduleId] 缓存损坏报错
    // 参见: https://github.com/vercel/next.js/issues/53387
    config.cache = false;
    return config;
  },
};

export default nextConfig;
