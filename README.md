# AI Creator Rush

A browser-based Three.js quick-session game prototype with:

- Animated player character (idle/walk/run)
- Third-person camera controls
- Trees and terrain
- Real-time animated lake
- AI NPCs with unique personas, memory, and streamed dialogue
- NVIDIA StepFun `stepfun-ai/step-3.5-flash` chat integration
- Browser-native speech synthesis for NPC responses (no TTS API required)
- Timed challenge loop with score, streak, credits, and instant replay
- AI judging by specialized NPC roles (direction, trend, risk)
- Collectible world orbs for bonus credits during runs
- Daily-rotating challenge mix with rarity drops and level progression
- Camera polish with shoulder follow, sprint FOV pulse, and FPS mode
- HDR-based lighting, shadows, fog, and bloom post-processing
- Expanded prop-rich world zones for a more immersive demo

## Setup

```bash
npm install
npm run dev
```

Open the local Vite URL in your browser.

Create a local env file before running:

```bash
cp .env.example .env
```

Add your API variables:

```bash
CHAT_API_KEY=your_chat_api_key_here
CHAT_MODEL=stepfun-ai/step-3.5-flash
IMAGE_API_KEY=your_image_api_key_here
```

NPC voice uses browser/system installed voices and does not require NVIDIA TTS access.

## Deploy to GitHub + Vercel

This project is now set up for Vercel production with serverless API routes:

- `api/chat/completions.js`
- `api/stable-diffusion.js`

These routes keep your API keys on the server in production.

1. Push to GitHub:

```bash
git init
git add .
git commit -m "prepare project for vercel deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

2. Import the repo in Vercel and use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

3. Add environment variables in Vercel Project Settings -> Environment Variables:

- `CHAT_API_KEY` (for StepFun/chat endpoint)
- `CHAT_MODEL=stepfun-ai/step-3.5-flash` (or your exact model)
- `IMAGE_API_KEY` (for Stable Diffusion/image endpoint)

Optional advanced endpoint overrides:

- `CHAT_API_BASE_URL`, `CHAT_API_PATH`
- `IMAGE_API_BASE_URL`, `IMAGE_API_PATH`

4. Redeploy from Vercel after saving env vars.

Notes:

- Do not commit `.env` (already ignored in `.gitignore`).
- You do not need to expose `VITE_IMAGE_API_KEY` in production.
- Local development still works with `npm run dev` and `.env`.

## Controls

- `W A S D`: Move
- `Shift`: Run
- `V`: Toggle first/third person
- Mouse drag: Orbit camera
- Mouse wheel: Zoom
- Move close to an NPC and use the dialogue panel to talk
- Toggle "Mute NPC voice" to disable speech playback
- Use `Start Run` to begin timed challenge rounds
- Generate image at the painting station, then `Submit Artwork` to score
- Build streaks and chase rarity drops for faster progression

## Reliability and Safety

- NPC chat and image prompts use lightweight safety filtering for unsafe text.
- Image generation has retry handling for temporary upstream failures.
- If browser voice is unavailable, dialogue remains functional in text mode.

## Files

- `src/game/World.js`: Render loop, scene setup, post-processing
- `src/game/GameState.js`: Run lifecycle, score/streak/currency state
- `src/game/ChallengeEngine.js`: Timed challenge generation and difficulty curve
- `src/game/CharacterController.js`: Player movement and animation blending
- `src/game/NPCManager.js`: NPC loading, animation updates, and persona metadata
- `src/game/Environment.js`: Terrain, trees, and additional world prop clusters
- `src/game/WaterSystem.js`: Animated lake water
- `src/game/Lighting.js`: HDR lighting, shadows, and renderer realism settings
- `src/services/nvidiaChat.js`: StepFun chat streaming wrapper
- `src/services/nvidiaTts.js`: Browser speech synthesis engine and voice selection
- `src/services/npcDialogueOrchestrator.js`: NPC memory + dialogue orchestration
- `src/ui/DialogueHud.js`: NPC dialogue UI binding and AI checklist status
- `src/ui/RunHud.js`: Challenge HUD and round summary controls
- `ASSETS.md`: Internet asset attribution

# ai-creator-rush-onechain
