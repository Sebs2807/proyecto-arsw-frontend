import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import fs from "fs";
import path from "path";

// Detectar entorno
const ENV = process.env.ENV || "local";

// Rutas a los certificados
const certPath = path.resolve(__dirname, "certs");
const httpsOptions =
  ENV === "local"
    ? {
        key: fs.readFileSync(path.join(certPath, "synapse+1-key.pem")),
        cert: fs.readFileSync(path.join(certPath, "synapse+1.pem")),
      }
    : undefined;

export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    https: httpsOptions,
    host: true,
    port: 5173,
  },
});
