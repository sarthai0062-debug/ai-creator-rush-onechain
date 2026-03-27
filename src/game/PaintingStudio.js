import * as THREE from "three";

const BLOCKED_PROMPT_TERMS = ["sexual minor", "child porn", "gore torture", "hate violence"];

function createWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, "#6d4323");
  gradient.addColorStop(0.5, "#4f3019");
  gradient.addColorStop(1, "#7f5530");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1200; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 18 + Math.random() * 56;
    const a = 0.02 + Math.random() * 0.07;
    ctx.fillStyle = `rgba(255,220,170,${a})`;
    ctx.fillRect(x, y, w, 1.4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class PaintingStudio {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.paintMaterial = null;
    this.statusEl = null;
    this.paintingCenter = new THREE.Vector3();
  }

  init() {
    const woodTex = createWoodTexture();
    const woodMaterial = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.86,
      metalness: 0.06,
      emissive: 0x251409,
      emissiveIntensity: 0.22,
    });

    // Keep this painting setup intentionally simple and stable.
    const boardWidth = 4.2;
    const boardHeight = 3.2;
    const frameDepth = 0.24;
    const border = 0.3;

    const standMaterial = new THREE.MeshStandardMaterial({
      color: 0x4d331f,
      roughness: 0.88,
      metalness: 0.03,
      map: woodTex,
      emissive: 0x2a180d,
      emissiveIntensity: 0.18,
    });

    const postLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.9, 0.2), standMaterial);
    postLeft.position.set(-1.65, 1.45, -0.08);
    postLeft.castShadow = true;
    this.group.add(postLeft);

    const postRight = postLeft.clone();
    postRight.position.x = 1.65;
    this.group.add(postRight);

    const support = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 0.2), standMaterial);
    support.position.set(0, 0.25, -0.1);
    support.castShadow = true;
    support.receiveShadow = true;
    this.group.add(support);

    this.paintMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f1e7,
      roughness: 0.95,
      metalness: 0,
      emissive: 0x090603,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });

    const painting = new THREE.Mesh(
      new THREE.PlaneGeometry(boardWidth - border * 2, boardHeight - border * 2),
      this.paintMaterial
    );
    painting.position.set(0, boardHeight / 2 + 0.5, frameDepth / 2 + 0.01);
    painting.receiveShadow = true;
    this.group.add(painting);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth, border, frameDepth),
      woodMaterial
    );
    top.position.set(0, boardHeight + 0.5, 0);
    top.castShadow = true;
    top.receiveShadow = true;

    const bottom = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth, border, frameDepth),
      woodMaterial
    );
    bottom.position.set(0, 0.5, 0);
    bottom.castShadow = true;
    bottom.receiveShadow = true;

    const left = new THREE.Mesh(
      new THREE.BoxGeometry(border, boardHeight, frameDepth),
      woodMaterial
    );
    left.position.set(-boardWidth / 2 + border / 2, boardHeight / 2 + 0.5, 0);
    left.castShadow = true;
    left.receiveShadow = true;

    const right = left.clone();
    right.position.x = boardWidth / 2 - border / 2;

    this.group.add(top, bottom, left, right);

    // Put the painting near the main area and face the player spawn.
    this.group.position.set(6.5, 0, -4.5);
    const dx = 0 - this.group.position.x;
    const dz = 0 - this.group.position.z;
    this.group.rotation.y = Math.atan2(dx, dz);

    // Small warm light to make the painting area visible.
    const glow = new THREE.PointLight(0xffd9a8, 0.7, 16, 2);
    glow.position.set(0, boardHeight / 2 + 0.5, 0.7);
    this.group.add(glow);

    this.paintingCenter.set(0, boardHeight / 2 + 0.5, frameDepth / 2 + 0.01);
    this.group.localToWorld(this.paintingCenter);
    this.scene.add(this.group);
  }

  getPaintingWorldPosition() {
    if (!this.group) return new THREE.Vector3();
    return this.paintingCenter.clone();
  }

  bindStatusElement(el) {
    this.statusEl = el;
  }

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  async requestImage(payload) {
    const proxyResponse = await fetch("/api/stable-diffusion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) return proxyResponse;
    if (proxyResponse.status !== 404) return proxyResponse;

    // 404 usually means no dev proxy (e.g. build/preview/static hosting).
    const directKey = import.meta.env.VITE_IMAGE_API_KEY || import.meta.env.VITE_NVAPI_KEY;
    if (!directKey) {
      return proxyResponse;
    }

    this.setStatus("Proxy not found. Trying direct NVIDIA API...");
    return fetch("https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${directKey}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async generatePainting(prompt) {
    const cleanedPrompt = String(prompt || "")
      .replace(/[<>`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    if (BLOCKED_PROMPT_TERMS.some((term) => cleanedPrompt.toLowerCase().includes(term))) {
      throw new Error("Prompt blocked by safety filter. Please try a safer creative prompt.");
    }
    const finalPrompt =
      cleanedPrompt ||
      "Vintage, steampunk-inspired airship soaring above a sprawling, Victorian-era cityscape, with intricate clockwork mechanisms and steam-powered engines";
    this.setStatus("Generating painting...");

    const payload = {
      prompt: finalPrompt,
      cfg_scale: 5,
      aspect_ratio: "16:9",
      seed: 0,
      steps: 50,
      negative_prompt: "",
    };
    let response = await this.requestImage(payload);
    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      this.setStatus("Generator busy, retrying...");
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      response = await this.requestImage(payload);
    }

    if (!response.ok) {
      const errText = await response.text();
      const maybeProxyHint =
        response.status === 404
          ? " Run with `npm run dev`, or set `VITE_IMAGE_API_KEY` (or `VITE_NVAPI_KEY`) for direct browser fallback."
          : "";
      throw new Error(`Image generation failed (${response.status}): ${errText}${maybeProxyHint}`);
    }

    const responseBody = await response.json();
    const b64 =
      responseBody?.image ||
      responseBody?.b64_json ||
      responseBody?.artifacts?.[0]?.base64 ||
      responseBody?.data?.[0]?.b64_json;
    const finishReason = responseBody?.finish_reason;
    const imageUrl = responseBody?.url || responseBody?.image_url;
    const mimeType =
      responseBody?.mime_type || responseBody?.artifacts?.[0]?.mime_type || "image/jpeg";

    if (!b64 && !imageUrl) {
      const fields = Object.keys(responseBody || {}).join(", ") || "none";
      throw new Error(`No image returned by API. Response fields: ${fields}`);
    }
    if (finishReason && finishReason !== "SUCCESS") {
      // Still try to render if `image` exists, but provide useful status.
      this.setStatus(`Generation finished: ${finishReason}`);
    }

    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(
      b64 ? `data:${mimeType};base64,${b64}` : imageUrl
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    if (this.paintMaterial.map) this.paintMaterial.map.dispose();
    this.paintMaterial.map = texture;
    this.paintMaterial.color.set(0xffffff);
    this.paintMaterial.needsUpdate = true;
    this.setStatus("Painting updated.");
  }
}
