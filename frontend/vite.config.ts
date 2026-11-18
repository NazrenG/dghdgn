import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 5173 is fixed (strictPort) because it must match the SPA redirect URI
// registered in Entra ID and the backend's CORS allowlist.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: "localhost",
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
