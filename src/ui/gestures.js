// Opt-in webcam hand tracking (MediaPipe, runs 100% in the browser).
//   point  → moves the field     pinch → shockwave
//   fist   → black hole          open  → supernova
//   swipe  → next / previous section
// The heavy library is lazy-loaded only when the visitor turns this on.

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0))

export class Gestures {
  constructor({ onPointer, onPinch, onFist, onSwipe, onStatus, preview }) {
    Object.assign(this, { onPointer, onPinch, onFist, onSwipe, onStatus })
    this.preview = preview // <canvas> for the skeleton HUD
    this.active = false
    this.pinching = false
    this.fist = false
    this.history = []
    this.lastSwipe = 0
  }

  async start() {
    if (this.active) return
    this.onStatus?.('loading')
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(WASM)
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    })
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    })
    this.video = document.createElement('video')
    this.video.srcObject = this.stream
    this.video.playsInline = true
    this.video.muted = true
    await this.video.play()
    this.active = true
    this.onStatus?.('on')
    this.loop()
  }

  stop() {
    this.active = false
    this.stream?.getTracks().forEach((t) => t.stop())
    this.landmarker?.close()
    this.landmarker = null
    if (this.fist) this.onFist?.(false)
    this.fist = false
    this.onStatus?.('off')
    const ctx = this.preview?.getContext('2d')
    ctx?.clearRect(0, 0, this.preview.width, this.preview.height)
  }

  loop = () => {
    if (!this.active) return
    if (this.video.readyState >= 2) {
      const res = this.landmarker.detectForVideo(this.video, performance.now())
      this.handle(res.landmarks?.[0])
    }
    requestAnimationFrame(this.loop)
  }

  handle(lm) {
    this.draw(lm)
    if (!lm) {
      if (this.fist) this.onFist?.(false)
      this.fist = false
      this.onPointer?.(null)
      return
    }
    // Mirror x so the hand behaves like a mirror image.
    const tip = lm[8]
    const x = (1 - tip.x) * 2 - 1
    const y = -(tip.y * 2 - 1)
    this.onPointer?.({ x, y })

    const scale = dist(lm[0], lm[9]) || 0.1
    const pinch = dist(lm[4], lm[8]) / scale < 0.35
    if (pinch && !this.pinching) this.onPinch?.()
    this.pinching = pinch

    const curl = [8, 12, 16, 20].reduce((s, k) => s + dist(lm[k], lm[0]), 0) / 4 / scale
    const fist = curl < 1.05
    if (fist !== this.fist) this.onFist?.(fist)
    this.fist = fist

    // Swipe: fast vertical palm motion.
    const now = performance.now()
    this.history.push({ y: lm[9].y, t: now })
    while (this.history.length && now - this.history[0].t > 250) this.history.shift()
    if (this.history.length > 3 && now - this.lastSwipe > 900 && !fist) {
      const dy = this.history[this.history.length - 1].y - this.history[0].y
      if (Math.abs(dy) > 0.28) {
        this.onSwipe?.(dy > 0 ? -1 : 1)
        this.lastSwipe = now
        this.history.length = 0
      }
    }
  }

  draw(lm) {
    const c = this.preview
    if (!c) return
    const ctx = c.getContext('2d')
    const w = c.width
    const h = c.height
    ctx.clearRect(0, 0, w, h)
    if (!lm) return
    const P = (p) => [(1 - p.x) * w, p.y * h]
    ctx.lineWidth = 1.5
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#7cf7ff'
    ctx.beginPath()
    for (const [a, b] of BONES) {
      const [x1, y1] = P(lm[a])
      const [x2, y2] = P(lm[b])
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()
    ctx.fillStyle = '#fff'
    for (const p of lm) {
      const [x, y] = P(p)
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
    }
  }
}
