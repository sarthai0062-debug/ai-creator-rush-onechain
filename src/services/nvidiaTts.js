const PROFILE_PRESETS = {
  alloy: { hints: ["samantha", "zoe", "allison"], rate: 0.98, pitch: 1.05, volume: 0.9 },
  verse: { hints: ["daniel", "alex", "fred"], rate: 1.06, pitch: 0.96, volume: 0.9 },
  echo: { hints: ["david", "jorge", "tom"], rate: 0.92, pitch: 0.9, volume: 0.92 },
  default: { hints: [], rate: 1.0, pitch: 1.0, volume: 0.9 },
};

function chooseVoice(voices, voiceProfile, languageCode = "en-US") {
  if (!voices.length) return null;
  const preset = PROFILE_PRESETS[voiceProfile] || PROFILE_PRESETS.default;
  const exactLang = voices.filter((v) => v.lang?.toLowerCase() === languageCode.toLowerCase());
  const sameFamily = voices.filter((v) => v.lang?.toLowerCase().startsWith("en-"));
  const pool = exactLang.length ? exactLang : sameFamily.length ? sameFamily : voices;

  const withHint = pool.find((voice) =>
    preset.hints.some((hint) => voice.name.toLowerCase().includes(hint))
  );
  return withHint || pool[0] || voices[0];
}

export function createSpeechPlayer() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  let activeUtterance = null;
  let voices = synth ? synth.getVoices() : [];
  let selectedVoiceName = "Default";

  if (synth) {
    const refreshVoices = () => {
      voices = synth.getVoices();
    };
    refreshVoices();
    synth.onvoiceschanged = refreshVoices;
  }

  return {
    stop() {
      synth?.cancel();
      activeUtterance = null;
    },

    getStatus() {
      return {
        engine: "Browser Voice",
        voiceName: selectedVoiceName,
        supported: Boolean(synth),
        hasVoices: voices.length > 0,
      };
    },

    async speak(text, voiceProfile = "default", languageCode = "en-US") {
      if (!synth) {
        return { engine: "Text Only", voiceName: "Unavailable", supported: false };
      }
      if (!text?.trim()) {
        return this.getStatus();
      }

      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const preset = PROFILE_PRESETS[voiceProfile] || PROFILE_PRESETS.default;
      const selectedVoice = chooseVoice(voices, voiceProfile, languageCode);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang || languageCode;
        selectedVoiceName = selectedVoice.name;
      } else {
        utterance.lang = languageCode;
        selectedVoiceName = "Default";
      }
      utterance.rate = preset.rate;
      utterance.pitch = preset.pitch;
      utterance.volume = preset.volume;

      activeUtterance = utterance;
      await new Promise((resolve) => {
        const timer = window.setTimeout(resolve, 12000);
        utterance.onend = () => {
          window.clearTimeout(timer);
          resolve();
        };
        utterance.onerror = () => {
          window.clearTimeout(timer);
          resolve();
        };
        synth.speak(utterance);
      });

      activeUtterance = null;
      return this.getStatus();
    },
  };
}
