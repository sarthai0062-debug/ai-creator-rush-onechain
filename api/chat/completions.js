const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

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
    const upstream = await fetch(NVIDIA_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(getRequestPayload(req)),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return sendJson(res, upstream.status, {
        error: text || "Upstream chat request failed.",
      });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected proxy failure.",
    });
  }
}
