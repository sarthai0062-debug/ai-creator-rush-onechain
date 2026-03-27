function getChatConfig() {
  const baseUrl = process.env.CHAT_API_BASE_URL || "https://integrate.api.nvidia.com";
  const path = process.env.CHAT_API_PATH || "/v1/chat/completions";
  const defaultModel = process.env.CHAT_MODEL || "stepfun-ai/step-3.5-flash";
  const token =
    process.env.CHAT_API_KEY ||
    process.env.NV_CHAT_API_KEY ||
    process.env.NVAPI_KEY ||
    process.env.VITE_NVAPI_KEY ||
    "";
  return {
    url: `${baseUrl}${path}`,
    token,
    defaultModel,
  };
}

function withDefaultModel(payload, defaultModel) {
  if (!payload || typeof payload !== "object") return { model: defaultModel };
  return payload.model ? payload : { ...payload, model: defaultModel };
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

  const { url, token, defaultModel } = getChatConfig();
  if (!token) {
    return sendJson(res, 500, {
      error:
        "Missing chat API key. Set CHAT_API_KEY (or NV_CHAT_API_KEY / NVAPI_KEY) on server.",
    });
  }

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(withDefaultModel(getRequestPayload(req), defaultModel)),
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
