const MUTE_STORAGE_KEY = 'ashk_flipbook_muted_v1';

let sharedAudioCtx: AudioContext | null = null;
let lastPlayTimestamp = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function getFlipbookMutedPreference(): boolean {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setFlipbookMutedPreference(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

export function primeFlipSoundAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

/**
 * Synthesizes a subtle, crisp paper page-flip sound via Web Audio API.
 * Uses zero external network assets and respects silent/muted mode.
 */
export function playPageFlipSound(muted?: boolean): void {
  if (muted) return;
  const nowMs = Date.now();
  if (nowMs - lastPlayTimestamp < 90) return;
  lastPlayTimestamp = nowMs;

  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  try {
    const duration = 0.16;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, frameCount, sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Filtered pink-like noise shaped like crisp paper sliding/turning
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      const env = Math.sin((i / frameCount) * Math.PI);
      output[i] = (b0 + b1 + b2 + white * 0.28) * 0.25 * env;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(2100, now);
    filter.frequency.exponentialRampToValueAtTime(880, now + duration);
    filter.Q.setValueAtTime(1.15, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  } catch {
    // ignore audio synthesis failures in restricted contexts
  }
}
