let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

export function playMessageSound() {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    // Gentle two-tone "pop" notification
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.08) // C6

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Audio not available, silently fail
  }
}

export function playNudgeSound() {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()

    // Buzzy vibration — two overlapping oscillators
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(150, ctx.currentTime)
    osc1.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4)

    osc2.type = 'square'
    osc2.frequency.setValueAtTime(160, ctx.currentTime)
    osc2.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.4)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.5)
    osc2.stop(ctx.currentTime + 0.5)
  } catch {
    // Audio not available, silently fail
  }
}

// Respect user preference
const SOUND_KEY = 'clofri-sound-enabled'

export function isSoundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) !== 'false'
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false')
}
