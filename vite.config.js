import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Vite config does not automatically merge .env into process.env here.
  const env = loadEnv(mode, process.cwd(), "");
  const nvApiKey = env.NVAPI_KEY || env.VITE_NVAPI_KEY || process.env.NVAPI_KEY || "";
  const authHeader = nvApiKey ? { Authorization: `Bearer ${nvApiKey}` } : {};
  const proxyHeaders = { ...authHeader, Accept: "application/json" };

  return {
  server: {
    proxy: {
      "/api/stable-diffusion": {
        target: "https://ai.api.nvidia.com",
        changeOrigin: true,
        secure: true,
        rewrite: () => "/v1/genai/stabilityai/stable-diffusion-3-medium",
        headers: proxyHeaders,
      },
      "/api/chat/completions": {
        target: "https://integrate.api.nvidia.com",
        changeOrigin: true,
        secure: true,
        rewrite: () => "/v1/chat/completions",
        headers: proxyHeaders,
      },
      "/api/audio/speech": {
        target: "https://integrate.api.nvidia.com",
        changeOrigin: true,
        secure: true,
        rewrite: () => "/v1/audio/speech",
        headers: {
          ...authHeader,
          Accept: "audio/mpeg",
        },
      },
    },
  },
  };
});
