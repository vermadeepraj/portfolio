// Fully generative soundscape — no audio files. Everything is synthesised
// with the Web Audio API: a detuned drone whose chord follows the section,
// filtered wind, a feedback-delay "space", and one-shot effects.

const CHORDS = [
  [55.0, 82.41, 110.0, 164.81], // A  — intro
  [49.0, 73.42, 98.0, 146.83], //  G  — about
  [55.0, 82.41, 110.0, 130.81], //  Am — experience
  [58.27, 87.31, 116.54, 174.61], // Bb — toolkit
  [43.65, 65.41, 87.31, 130.81], // F  — work
  [51.91, 77.78, 103.83, 155.56], // Ab — contact
]

export class AudioEngine {
  constructor() {
    this.enabled = false
    this.ctx = null
  }

  build() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 4
    this.master.connect(comp).connect(ctx.destination)

    // Space: stereo feedback delay acting as a cheap reverb.
    this.space = ctx.createGain()
    this.space.gain.value = 0.5
    const dl = ctx.createDelay(1)
    const dr = ctx.createDelay(1)
    dl.delayTime.value = 0.37
    dr.delayTime.value = 0.53
    const fb = ctx.createGain()
    fb.gain.value = 0.55
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2200
    const merger = ctx.createChannelMerger(2)
    this.space.connect(dl)
    this.space.connect(dr)
    dl.connect(tone)
    dr.connect(tone)
    tone.connect(fb).connect(dl)
    dl.connect(merger, 0, 0)
    dr.connect(merger, 0, 1)
    merger.connect(this.master)

    // Drone.
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 420
    this.filter.Q.value = 6
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.16
    this.filter.connect(droneGain)
    droneGain.connect(this.master)
    droneGain.connect(this.space)

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoAmt = ctx.createGain()
    lfoAmt.gain.value = 160
    lfo.connect(lfoAmt).connect(this.filter.frequency)
    lfo.start()

    this.voices = CHORDS[0].map((f, i) => {
      const o = ctx.createOscillator()
      o.type = i % 2 ? 'sawtooth' : 'triangle'
      o.frequency.value = f
      o.detune.value = (i - 1.5) * 7
      const g = ctx.createGain()
      g.gain.value = i === 0 ? 0.5 : 0.28
      o.connect(g).connect(this.filter)
      o.start()
      return o
    })

    // Wind: filtered noise.
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const wind = ctx.createBufferSource()
    wind.buffer = this.noiseBuffer
    wind.loop = true
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'bandpass'
    this.windFilter.frequency.value = 600
    this.windFilter.Q.value = 0.8
    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0.025
    wind.connect(this.windFilter).connect(this.windGain).connect(this.master)
    wind.start()

    // Black-hole hum.
    this.hum = ctx.createOscillator()
    this.hum.type = 'sawtooth'
    this.hum.frequency.value = 38
    this.humFilter = ctx.createBiquadFilter()
    this.humFilter.type = 'lowpass'
    this.humFilter.frequency.value = 120
    this.humGain = ctx.createGain()
    this.humGain.gain.value = 0
    this.hum.connect(this.humFilter).connect(this.humGain)
    this.humGain.connect(this.master)
    this.humGain.connect(this.space)
    this.hum.start()
  }

  async enable() {
    if (!this.ctx) this.build()
    await this.ctx.resume()
    this.enabled = true
    this.master.gain.cancelScheduledValues(this.ctx.currentTime)
    this.master.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.8)
  }

  disable() {
    if (!this.ctx) return
    this.enabled = false
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25)
  }

  toggle() {
    return this.enabled ? (this.disable(), false) : (this.enable(), true)
  }

  setSection(index) {
    if (!this.ctx) return
    const chord = CHORDS[index % CHORDS.length]
    const t = this.ctx.currentTime
    this.voices.forEach((o, i) => o.frequency.setTargetAtTime(chord[i], t, 1.2))
  }

  // 0..1 — scroll speed / energy opens the filter and the wind.
  setEnergy(e) {
    if (!this.enabled) return
    const t = this.ctx.currentTime
    this.filter.frequency.setTargetAtTime(380 + e * 2600, t, 0.2)
    this.windGain.gain.setTargetAtTime(0.02 + e * 0.08, t, 0.3)
    this.windFilter.frequency.setTargetAtTime(500 + e * 1800, t, 0.3)
  }

  setHole(strength) {
    if (!this.enabled) return
    const t = this.ctx.currentTime
    this.humGain.gain.setTargetAtTime(strength * 0.3, t, 0.1)
    this.hum.frequency.setTargetAtTime(38 + strength * 60, t, 0.2)
    this.humFilter.frequency.setTargetAtTime(120 + strength * 900, t, 0.2)
  }

  boom(power = 1) {
    if (!this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(140, t)
    o.frequency.exponentialRampToValueAtTime(28, t + 0.9)
    const g = ctx.createGain()
    const peak = Math.min(0.9, 0.35 + power * 0.15)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
    o.connect(g).connect(this.master)
    g.connect(this.space)
    o.start(t)
    o.stop(t + 1.5)

    const n = ctx.createBufferSource()
    n.buffer = this.noiseBuffer
    const nf = ctx.createBiquadFilter()
    nf.type = 'lowpass'
    nf.frequency.setValueAtTime(6000, t)
    nf.frequency.exponentialRampToValueAtTime(200, t + 1.2)
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.25 * Math.min(power, 3), t)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    n.connect(nf).connect(ng).connect(this.master)
    ng.connect(this.space)
    n.start(t)
    n.stop(t + 1.3)
  }

  blip(freq = 880) {
    if (!this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(freq, t)
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.08)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    o.connect(g).connect(this.master)
    g.connect(this.space)
    o.start(t)
    o.stop(t + 0.2)
  }

  tick() {
    if (!this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const n = ctx.createBufferSource()
    n.buffer = this.noiseBuffer
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 3000 + Math.random() * 3000
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.05, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
    n.connect(f).connect(g).connect(this.master)
    n.start(t, Math.random())
    n.stop(t + 0.05)
  }
}
