import type { NextConfig } from "next";
import os from "os";

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const networkInterface = interfaces[name];
    if (networkInterface) {
      for (const iface of networkInterface) {
        if (iface.family === "IPv4" && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
  }
  return addresses;
}

const localIps = getLocalIpAddresses();
const allowedOrigins = [
  "localhost:3000",
  "http://localhost:3000",
  "127.0.0.1:3000",
  "http://127.0.0.1:3000",
  ...localIps.map((ip) => `${ip}:3000`),
  ...localIps.map((ip) => `http://${ip}:3000`),
  ...localIps.map((ip) => `${ip}:3001`),
  ...localIps.map((ip) => `http://${ip}:3001`),
  ...localIps.map((ip) => `${ip}:5000`),
  ...localIps.map((ip) => `http://${ip}:5000`),
  ...localIps.map((ip) => `${ip}:80`),
  ...localIps.map((ip) => `http://${ip}:80`),
  ...localIps,
  ...localIps.map((ip) => `http://${ip}`),
];

console.log("[next.config.ts] Automatically allowing local network origins for Server Actions:", allowedOrigins);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
