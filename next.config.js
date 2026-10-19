/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Necesario para empaquetar la app de escritorio (Electron).
  output: "standalone",
};

module.exports = nextConfig;
