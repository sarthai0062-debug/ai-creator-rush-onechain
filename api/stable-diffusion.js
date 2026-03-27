const NVIDIA_IMAGE_URL =
  "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium";

function readBearerToken() {
  return process.env.NVAPI_KEY || process.env.VITE_NVAPI_KEY || "";
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

  const token = readBearerToken();
  if (!token) {
    return sendJson(res, 500, {
      error: "Missing NVAPI_KEY environment variable on server.",
    });
  }

  try {
    const upstream = await fetch(NVIDIA_IMAGE_URL, {
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
