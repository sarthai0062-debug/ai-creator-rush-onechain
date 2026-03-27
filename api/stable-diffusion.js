function getImageConfig() {
  const baseUrl = process.env.IMAGE_API_BASE_URL || "https://ai.api.nvidia.com";
  const path =
    process.env.IMAGE_API_PATH || "/v1/genai/stabilityai/stable-diffusion-3-medium";
  const token =
    process.env.IMAGE_API_KEY ||
    process.env.NV_IMAGE_API_KEY ||
    process.env.NVAPI_KEY ||
    process.env.VITE_NVAPI_KEY ||
    "";
  return {
    url: `${baseUrl}${path}`,
    token,
  };
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function getRequestPayload(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const { url, token } = getImageConfig();
  if (!token) {
    return sendJson(res, 500, {
      error:
        "Missing image API key. Set IMAGE_API_KEY (or NV_IMAGE_API_KEY / NVAPI_KEY) on server.",
    });
  }

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(getRequestPayload(req)),
    });

    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return sendJson(res, upstream.status, data);
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected proxy failure.",
    });
  }
}
