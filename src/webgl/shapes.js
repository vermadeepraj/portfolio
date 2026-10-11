// Procedural point-cloud targets. Each generator fills `count` xyz points
// (stored RGBA for a float DataTexture). `extent` is the shape's rough radius,
// used to fit it to the viewport; the other fields drive per-section layout.

const TAU = Math.PI * 2
const rand = (a = 0, b = 1) => a + Math.random() * (b - a)
// Box–Muller gaussian for soft, organic jitter.
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random())

function buffer(count, fn) {
  const data = new Float32Array(count * 4)
  const p = [0, 0, 0]
  for (let i = 0; i < count; i++) {
    fn(p, i)
    data[i * 4] = p[0]
    data[i * 4 + 1] = p[1]
    data[i * 4 + 2] = p[2]
    data[i * 4 + 3] = 1
  }
  return data
}

// Rasterise the name into a canvas and sample lit pixels.
export function textShape(count, text, fontFamily, halo = true) {
  const W = 2048
  const H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  let fontSize = 380
  ctx.font = `800 ${fontSize}px ${fontFamily}`
  const measured = ctx.measureText(text).width
  fontSize *= Math.min(1, (W * 0.92) / measured)
  ctx.font = `800 ${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(text, W / 2, H / 2)

  const img = ctx.getImageData(0, 0, W, H).data
  const pixels = []
  let minX = W, maxX = 0, minY = H, maxY = 0
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (img[(y * W + x) * 4 + 3] > 128) {
        pixels.push(x, y)
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const n = pixels.length / 2
  const width = 8
  const unit = width / Math.max(1, maxX - minX)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  return buffer(count, (p, i) => {
    // 6% of particles form a faint halo so the name "breathes".
    if (halo && i % 29 === 0) {
      p[0] = gauss() * 2.6
      p[1] = gauss() * 0.7
      p[2] = gauss() * 0.6
      return
    }
    const k = Math.floor(Math.random() * n) * 2
    p[0] = (pixels[k] - cx + rand(-1, 1)) * unit
    p[1] = -(pixels[k + 1] - cy + rand(-1, 1)) * unit
    p[2] = gauss() * 0.06
  })
}

// Rebuild the owner's photo out of particles. Density follows brightness
// plus edges (glasses, beard, lapels), depth follows brightness for relief,
// and every particle remembers the real colour of the pixel it came from.
function portraitShape(count, image) {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0, S, S)
  const px = ctx.getImageData(0, 0, S, S).data

  const lum = new Float32Array(S * S)
  for (let i = 0; i < S * S; i++) {
    lum[i] = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255
  }
  const weights = new Float32Array(S * S)
  let total = 0
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const i = y * S + x
      const a = px[i * 4 + 3] / 255
      if (a < 0.5) continue
      const gx = lum[i + 1] - lum[i - 1]
      const gy = lum[i + S] - lum[i - S]
      const edge = Math.min(1, Math.hypot(gx, gy) * 4)
      const fade = 1 - Math.max(0, (y / S - 0.8) / 0.2) // dissolve the bottom crop
      // cap highlights so the white shirt doesn't drown the face
      const w = (0.035 + Math.pow(Math.min(lum[i], 0.7) / 0.7, 1.5) + edge * 1.2) * a * fade
      weights[i] = w
      total += w
    }
  }
  // Cumulative distribution for weighted sampling.
  const cdf = new Float32Array(S * S)
  let acc = 0
  for (let i = 0; i < S * S; i++) cdf[i] = acc += weights[i] / total

  const colors = new Float32Array(count * 4)
  const size = 5.4
  const data = buffer(count, (p, n) => {
    const r = Math.random()
    let lo = 0, hi = S * S - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cdf[mid] < r) lo = mid + 1
      else hi = mid
    }
    const x = (lo % S) + Math.random()
    const y = Math.floor(lo / S) + Math.random()
    p[0] = (x / S - 0.5) * size
    p[1] = -(y / S - 0.5) * size
    p[2] = (lum[lo] - 0.45) * 0.5 + gauss() * 0.01
    // sRGB → linear so it matches the renderer's colour pipeline
    colors[n * 4] = Math.pow(px[lo * 4] / 255, 2.2)
    colors[n * 4 + 1] = Math.pow(px[lo * 4 + 1] / 255, 2.2)
    colors[n * 4 + 2] = Math.pow(px[lo * 4 + 2] / 255, 2.2)
    colors[n * 4 + 3] = 1
  })
  return { data, colors }
}

// A layered neural network — nodes on rings, every layer fully connected
// to the next. Fits the AI / automation work in the Experience section.
function networkShape(count) {
  const layers = [3, 5, 6, 5, 3]
  const nodes = []
  layers.forEach((n, li) => {
    const x = (li - (layers.length - 1) / 2) * 1.25
    const r = 0.45 + n * 0.17
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + li * 0.7
      nodes.push({ x, y: Math.cos(a) * r, z: Math.sin(a) * r, layer: li })
    }
  })
  const edges = []
  for (const a of nodes) for (const b of nodes) if (b.layer === a.layer + 1) edges.push([a, b])

  return buffer(count, (p) => {
    if (Math.random() < 0.3) {
      const n = nodes[(Math.random() * nodes.length) | 0]
      p[0] = n.x + gauss() * 0.07
      p[1] = n.y + gauss() * 0.07
      p[2] = n.z + gauss() * 0.07
    } else {
      const [a, b] = edges[(Math.random() * edges.length) | 0]
      const t = Math.random()
      p[0] = a.x + (b.x - a.x) * t + gauss() * 0.012
      p[1] = a.y + (b.y - a.y) * t + gauss() * 0.012
      p[2] = a.z + (b.z - a.z) * t + gauss() * 0.012
    }
  })
}

function globeShape(count) {
  const R = 1.55
  const golden = Math.PI * (3 - Math.sqrt(5))
  const shellCount = Math.floor(count * 0.62)
  return buffer(count, (p, i) => {
    if (i < shellCount) {
      // Fibonacci sphere, with latitude bands emphasised.
      const y = 1 - (i / (shellCount - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = golden * i
      const band = Math.random() < 0.35
      const yy = band ? Math.round(y * 6) / 6 : y
      const rr = band ? Math.sqrt(1 - yy * yy) : r
      p[0] = Math.cos(th) * rr * R
      p[1] = yy * R
      p[2] = Math.sin(th) * rr * R
    } else if (i < count * 0.9) {
      // Saturn-like ring in the xz plane (tilted by layout).
      const a = rand(0, TAU)
      const rr = 2.15 + Math.pow(Math.random(), 2) * 0.6
      p[0] = Math.cos(a) * rr
      p[1] = gauss() * 0.02
      p[2] = Math.sin(a) * rr
    } else {
      // inner core
      const u = rand(-1, 1)
      const a = rand(0, TAU)
      const rr = Math.cbrt(Math.random()) * 0.6
      const s = Math.sqrt(1 - u * u)
      p[0] = s * Math.cos(a) * rr
      p[1] = u * rr
      p[2] = s * Math.sin(a) * rr
    }
  })
}

function galaxyShape(count) {
  const arms = 4
  const radius = 3.2
  const spin = 1.35
  return buffer(count, (p, i) => {
    if (i % 9 === 0) {
      // bulge
      p[0] = gauss() * 0.3
      p[1] = gauss() * 0.18
      p[2] = gauss() * 0.3
      return
    }
    const r = Math.pow(Math.random(), 1.4) * radius
    const arm = ((i % arms) / arms) * TAU
    const a = arm + r * spin
    const scatter = Math.pow(Math.random(), 3) * (0.9 - r * 0.12) + 0.04
    p[0] = Math.cos(a) * r + gauss() * scatter
    p[1] = gauss() * 0.06 * (1.2 - r / radius)
    p[2] = Math.sin(a) * r + gauss() * scatter
  })
}

function portalShape(count) {
  const R = 2.0
  const tube = 0.32
  return buffer(count, (p, i) => {
    if (Math.random() < 0.72) {
      const u = rand(0, TAU)
      const v = rand(0, TAU)
      const tt = tube * (0.85 + Math.random() * 0.3)
      p[0] = (R + tt * Math.cos(v)) * Math.cos(u)
      p[1] = tt * Math.sin(v)
      p[2] = (R + tt * Math.cos(v)) * Math.sin(u)
    } else {
      // vortex falling into the ring's centre
      const t = Math.random()
      const rr = Math.sqrt(t) * (R - 0.25)
      const a = t * 9 + rand(0, TAU) * 0.15 + (i % 3) * (TAU / 3)
      p[0] = Math.cos(a) * rr
      p[1] = -(1 - t) * 1.1 + gauss() * 0.04
      p[2] = Math.sin(a) * rr
    }
  })
}

export function buildShapes(count, name, fontFamily, portraitImage) {
  const portrait = portraitShape(count, portraitImage)
  return [
    { key: 'text', data: textShape(count, name.toUpperCase(), fontFamily), extent: 4, side: 0, y: 0.07, tilt: 0, spin: 0, opacity: 0.8 },
    { key: 'portrait', data: portrait.data, colors: portrait.colors, extent: 2.7, side: 1, y: 0.02, tilt: 0, spin: 0, sway: 0.28, opacity: 0.75, size: 0.5, turb: 0.12 },
    { key: 'network', data: networkShape(count), extent: 2.6, side: 1, y: 0, tilt: 0.22, spin: 0.25, opacity: 0.75 },
    { key: 'globe', data: globeShape(count), extent: 2.75, side: 1, y: 0, tilt: 0.38, spin: 0.22, opacity: 0.7 },
    { key: 'galaxy', data: galaxyShape(count), extent: 3.2, side: 1, y: 0, tilt: 1.0, spin: 0.12, opacity: 0.75 },
    { key: 'portal', data: portalShape(count), extent: 2.4, side: 0, y: 0.02, tilt: 1.22, spin: 0.3, opacity: 0.5, z: -1.2 },
  ]
}
