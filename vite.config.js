import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const fallbackKey = env.NVAPI_KEY || process.env.NVAPI_KEY || env.VITE_NVAPI_KEY || "";
  const chatKey = env.CHAT_API_KEY || env.NV_CHAT_API_KEY || fallbackKey;
  const imageKey = env.IMAGE_API_KEY || env.NV_IMAGE_API_KEY || fallbackKey;
  const chatTarget = env.CHAT_API_BASE_URL || "https://integrate.api.nvidia.com";
  const imageTarget = env.IMAGE_API_BASE_URL || "https://ai.api.nvidia.com";
  const chatPath = env.CHAT_API_PATH || "/v1/chat/completions";
  const imagePath = env.IMAGE_API_PATH || "/v1/genai/stabilityai/stable-diffusion-3-medium";
  const chatHeaders = {
    ...(chatKey ? { Authorization: `Bearer ${chatKey}` } : {}),
    Accept: "text/event-stream",
  };
  const imageHeaders = {
    ...(imageKey ? { Authorization: `Bearer ${imageKey}` } : {}),
    Accept: "application/json",
  };

  return {
    server: {
      proxy: {
        "/api/stable-diffusion": {
          target: imageTarget,
          changeOrigin: true,
          secure: true,
          rewrite: () => imagePath,
          headers: imageHeaders,
        },
        "/api/chat/completions": {
          target: chatTarget,
          changeOrigin: true,
          secure: true,
          rewrite: () => chatPath,
          headers: chatHeaders,
        },
      },
    },
  };
});
