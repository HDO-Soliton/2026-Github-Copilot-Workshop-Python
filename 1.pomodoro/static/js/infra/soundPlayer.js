function createNoopSoundPlayer() {
  return {
    playBell() {},
  };
}

function createBrowserSoundPlayer() {
  let audioContext;

  return {
    playBell() {
      if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
        return;
      }

      if (!audioContext) {
        audioContext = new window.AudioContext();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.26);
    },
  };
}

const api = {
  createNoopSoundPlayer,
  createBrowserSoundPlayer,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.PomodoroSoundPlayer = api;
}
