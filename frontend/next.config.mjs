/** @type {import('next').NextConfig} */
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@components": "./src/components",
      "@app": "./src/app",
      "@apis": "./src/apis",
      "@hooks": "./src/hooks",
      "@utils": "./src/utils",
    };
    return config;
  },
};

export default nextConfig;
