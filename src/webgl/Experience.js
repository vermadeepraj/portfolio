import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { Particles } from './Particles.js'
import backgroundFrag from './shaders/background.frag?raw'
import finalFrag from './shaders/final.frag?raw'

const lerp = (a, b, t) => a + (b - a) * t
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt))
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`
const PASS_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

export class Experience {
  constructor({ canvas, shapes, palettes, state, isMobile, reducedMotion }) {
    this.state = state
    this.shapes = shapes
    this.isMobile = isMobile
    this.reducedMotion = reducedMotion
    this.palettes = palettes.map((p) => p.map((hex) => new THREE.Color(hex)))

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    renderer.setClearColor(0x03030a, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    this.renderer = renderer
    this.maxDpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)
    this.dpr = this.maxDpr

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120)
    this.camera.position.set(0, 0, 10)

    this.createBackground()
    this.createStars(isMobile ? 900 : 2200)

    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
    this.particles = new Particles(renderer, {
      size: isMobile ? 128 : 256,
      shapes,
      halfFloat: isIOS,
    })
    this.baseSize = isMobile ? 42 : 30
    this.particles.material.uniforms.uSize.value = this.baseSize
    this.scene.add(this.particles.points)

    this.createComposer()

    this.colors = this.palettes[0].map((c) => c.clone())
    this.targetColors = this.palettes[0].map((c) => c.clone())
    this.accent = new THREE.Color()
    this.spins = shapes.map(() => 0)

    this.raycaster = new THREE.Raycaster()
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    this.mouseWorld = new THREE.Vector3(999, 999, 0)
    this.prevMouseWorld = new THREE.Vector3()
    this.mouseVel = new THREE.Vector3()
    this.ndc = new THREE.Vector2()

    this.speak = { value: 0, until: -1 }
    this.hole = { strength: 0, holding: false, start: 0 }
    this.mirror = { value: 0, on: false, aspect: 4 / 3 }
    this.portraitIndex = shapes.findIndex((s) => s.colors)
    this.time = 0
    this.fps = { frames: 0, acc: 0, value: 60, low: 0 }

    this.resize()
  }

  createBackground() {
    this.bgMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: backgroundFrag,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color() },
        uColorB: { value: new THREE.Color() },
        uMouse: { value: new THREE.Vector2() },
        uAspect: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    })
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bgMaterial)
    bg.frustumCulled = false
    bg.renderOrder = -1
    this.scene.add(bg)
  }

  createStars(count) {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1
      const a = Math.random() * Math.PI * 2
      const r = 18 + Math.random() * 40
      const s = Math.sqrt(1 - u * u)
      pos.set([s * Math.cos(a) * r, u * r, s * Math.sin(a) * r - 20], i * 3)
      seed[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    this.starMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime; uniform float uPixelRatio;
        varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 1.8) + aSeed * 40.0));
          gl_PointSize = (1.0 + aSeed * 2.2) * uPixelRatio;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(vec3(0.75, 0.8, 1.0) * smoothstep(0.5, 0.0, d) * vA * 0.55, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.stars = new THREE.Points(geo, this.starMaterial)
    this.stars.frustumCulled = false
    this.scene.add(this.stars)
  }

  createComposer() {
    const composer = new EffectComposer(this.renderer)
    composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 0.22)
    composer.addPass(this.bloom)
    composer.addPass(new OutputPass())
    this.finalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uAberration: { value: 0.002 },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: PASS_VERT,
      fragmentShader: finalFrag,
    })
    composer.addPass(this.finalPass)
    this.composer = composer
  }

  // Fit each shape into the viewport and decide where it sits.
  computeLayout() {
    const cam = this.camera
    const dist = cam.position.z
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist
    const vw = vh * cam.aspect
    const mobile = cam.aspect < 0.95
    this.view = { vw, vh, mobile }

    this.layout = this.shapes.map((s, i) => {
      let avail
      if (s.key === 'text') avail = mobile ? vw * 0.45 : Math.min(vw * 0.4, 4.6)
      else avail = mobile ? Math.min(vw * 0.46, vh * 0.3) : Math.min(vw * 0.25, vh * 0.42)
      const scale = Math.min(1.15, avail / s.extent)
      const x = mobile ? 0 : s.side * vw * 0.23
      const y = (mobile && s.key !== 'text' ? -0.05 : s.y) * vh
      const opacity = mobile && i > 0 ? s.opacity * 0.55 : s.opacity
      return { offset: new THREE.Vector3(x, y, s.z || 0), scale, tilt: s.tilt, spin: s.spin, opacity, size: s.size ?? 1, turb: s.turb ?? 1 }
    })

    // Where spoken words appear: over the current shape, fitted to the free space.
    this.speakFit = this.layout.map((l, i) => {
      const s = this.shapes[i]
      const half = mobile ? vw * 0.42 : s.side ? vw * 0.2 : Math.min(vw * 0.38, 4.4)
      return { scale: Math.min(1.1, half / 4), x: l.offset.x, y: mobile ? vh * 0.12 : l.offset.y }
    })
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(w, h, false)
    this.composer.setPixelRatio(this.dpr)
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w / 2, h / 2)
    this.finalPass.uniforms.uResolution.value.set(w * this.dpr, h * this.dpr)
    this.particles.material.uniforms.uPixelRatio.value = this.dpr
    this.starMaterial.uniforms.uPixelRatio.value = this.dpr
    this.bgMaterial.uniforms.uAspect.value = w / h
    this.computeLayout()
  }

  // ── Public interactions ────────────────────────────────────
  shockwave(power = 1, at = this.mouseWorld) {
    const u = this.particles.uniforms
    const p = at.x > 500 ? new THREE.Vector3() : at
    u.uShock.value.set(p.x, p.y, p.z, this.time)
    u.uShockPower.value = power
  }

  setHolding(on) {
    if (on && !this.hole.holding) {
      this.hole.holding = true
      this.hole.start = this.time
    } else if (!on && this.hole.holding) {
      this.hole.holding = false
      const held = this.time - this.hole.start
      // Supernova: the longer you held, the bigger the blast.
      this.shockwave(1.2 + Math.min(held, 3) * 1.1, this.particles.uniforms.uHole.value)
      return held
    }
    return 0
  }

  // Hologram Mirror: hand the field a <video> and it becomes the visitor.
  setMirror(video) {
    if (video) {
      const tex = new THREE.VideoTexture(video)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.minFilter = THREE.LinearFilter
      this.particles.setVideo(tex)
      this.mirror.texture = tex
      this.mirror.aspect = (video.videoWidth || 4) / (video.videoHeight || 3)
      this.mirror.on = true
    } else {
      this.mirror.on = false
    }
  }

  speakWord(data, duration = 3.2) {
    this.particles.setSpeakShape(data)
    this.speak.until = this.time + duration
  }

  // Current world-space position of the pointer (for HUD readouts).
  get pointer() {
    return this.mouseWorld
  }

  // ── Frame ─────────────────────────────────────────────────
  update(time, dt) {
    this.time = time
    const st = this.state
    const u = this.particles.uniforms
    const n = this.shapes.length

    // Scroll → which two shapes we're between, and how far.
    const s = clamp(st.scroll, 0, n - 1)
    const i = Math.min(Math.floor(s), n - 2)
    const f = smoothstep(0.2, 0.8, s - i)
    const A = this.layout[i]
    const B = this.layout[i + 1]

    const velBoost = 1 + Math.min(Math.abs(st.scrollVelocity) * 0.02, 1.5)
    for (let k = 0; k < n; k++) {
      const sway = this.shapes[k].sway
      this.spins[k] = sway ? Math.sin(time * 0.45) * sway : this.spins[k] + dt * this.layout[k].spin * velBoost
    }

    u.uTargetA.value = this.particles.targets[i]
    u.uTargetB.value = this.particles.targets[i + 1]
    u.uMorph.value = f
    u.uOffsetA.value.copy(A.offset)
    u.uOffsetB.value.copy(B.offset)
    u.uXformA.value.set(this.spins[i], A.tilt, A.scale)
    u.uXformB.value.set(this.spins[i + 1], B.tilt, B.scale)

    // Speaking.
    const speaking = time < this.speak.until
    this.speak.value = damp(this.speak.value, speaking ? 1 : 0, speaking ? 1.6 : 2.2, dt)
    u.uSpeak.value = this.speak.value
    const fit = this.speakFit[Math.round(s)]
    u.uSpeakXform.value.set(fit.scale, fit.x, fit.y)

    // Pointer in world space.
    this.ndc.set(st.pointer.x, st.pointer.y)
    this.raycaster.setFromCamera(this.ndc, this.camera)
    const hit = new THREE.Vector3()
    if (this.raycaster.ray.intersectPlane(this.plane, hit)) {
      this.prevMouseWorld.copy(this.mouseWorld)
      this.mouseWorld.copy(hit)
      if (this.prevMouseWorld.x < 500 && dt > 0) {
        const v = hit.clone().sub(this.prevMouseWorld).divideScalar(dt)
        v.clampLength(0, 25)
        this.mouseVel.lerp(v, 0.3)
      }
    }
    u.uMouse.value.copy(this.mouseWorld)
    u.uMouseVel.value.copy(this.mouseVel)
    u.uMouseForce.value = damp(u.uMouseForce.value, st.pointerActive ? 12 : 0, 4, dt)

    // Black hole.
    const holdTarget = this.hole.holding ? smoothstep(0, 1.2, time - this.hole.start) : 0
    this.hole.strength = damp(this.hole.strength, holdTarget, this.hole.holding ? 3 : 14, dt)
    u.uHole.value.set(this.mouseWorld.x, this.mouseWorld.y, 0, this.hole.strength)
    if (this.mouseWorld.x > 500) u.uHole.value.set(0, 0, 0, this.hole.strength)

    // Mirror.
    const m = this.mirror
    m.value = damp(m.value, m.on ? 1 : 0, m.on ? 1.4 : 2.5, dt)
    if (!m.on && m.value < 0.002 && m.texture) {
      this.particles.setVideo(null)
      m.texture.dispose()
      m.texture = null
    }
    u.uMirror.value = m.value
    this.particles.material.uniforms.uMirror.value = m.value
    {
      const { vw, vh } = this.view
      let h = vh * 0.8
      let w = h * m.aspect
      if (w > vw * 0.92) {
        w = vw * 0.92
        h = w / m.aspect
      }
      u.uMirrorRect.value.set(w, h, 0, 0.02 * vh)
    }

    const calm = (this.reducedMotion ? 0.35 : 1) * (1 - m.value * 0.6)
    // Per-shape focus: the portrait wants fine, calm particles to read as a face.
    const focus = 1 - Math.max(this.speak.value, this.hole.strength)
    const turb = lerp(1, lerp(A.turb, B.turb, f), focus)
    const size = lerp(1, lerp(A.size, B.size, f), focus) * lerp(1, 0.8, m.value)
    this.particles.material.uniforms.uSize.value = this.baseSize * size
    u.uTurbulence.value = (0.55 * turb + Math.min(Math.abs(st.scrollVelocity) * 0.04, 2.5)) * calm

    // Palette: blend between sections, or take the hovered project's colour.
    const pa = this.palettes[i]
    const pb = this.palettes[i + 1]
    for (let k = 0; k < 3; k++) this.targetColors[k].copy(pa[k]).lerp(pb[k], f)
    if (st.accent) {
      this.accent.set(st.accent)
      this.targetColors[0].copy(this.accent)
      this.targetColors[1].copy(this.accent).offsetHSL(0.06, 0, -0.1)
    }
    const cl = 1 - Math.exp(-3.5 * dt)
    for (let k = 0; k < 3; k++) this.colors[k].lerp(this.targetColors[k], cl)

    const pu = this.particles.material.uniforms
    pu.uColorA.value.copy(this.colors[0])
    pu.uColorB.value.copy(this.colors[1])
    pu.uColorC.value.copy(this.colors[2])
    const P = this.portraitIndex
    const portraitWeight = i === P ? 1 - f : i + 1 === P ? f : 0
    pu.uPhotoMix.value = portraitWeight * (1 - this.speak.value) * (1 - m.value)
    const baseOpacity = Math.max(lerp(A.opacity, B.opacity, f), m.value)
    const targetOpacity = Math.max(baseOpacity, this.speak.value * 0.85) * (1 - this.hole.strength * 0.45)
    pu.uOpacity.value = damp(pu.uOpacity.value, targetOpacity, 3, dt)

    this.particles.update(time, dt)

    // Background, stars, camera.
    const bu = this.bgMaterial.uniforms
    bu.uTime.value = time
    bu.uColorA.value.copy(this.colors[0])
    bu.uColorB.value.copy(this.colors[1])
    bu.uMouse.value.lerp(this.ndc, 0.05)
    this.starMaterial.uniforms.uTime.value = time
    this.stars.rotation.y = time * 0.006 + st.scroll * 0.12
    this.stars.rotation.x = st.scroll * 0.05

    const cam = this.camera
    const px = this.isMobile ? 0 : st.pointer.x * 0.35
    const py = this.isMobile ? 0 : st.pointer.y * 0.22
    cam.position.x = damp(cam.position.x, px, 2.5, dt)
    cam.position.y = damp(cam.position.y, py, 2.5, dt)
    cam.lookAt(0, 0, 0)

    this.finalPass.uniforms.uTime.value = time
    const ab = 0.0018 + Math.min(Math.abs(st.scrollVelocity) * 0.0005, 0.012) + this.hole.strength * 0.006
    this.finalPass.uniforms.uAberration.value = damp(this.finalPass.uniforms.uAberration.value, ab, 6, dt)

    this.composer.render(dt)
    this.trackPerformance(dt)
  }

  // Adaptive resolution: drop pixel ratio if we can't hold ~45fps.
  trackPerformance(dt) {
    const f = this.fps
    f.frames++
    f.acc += dt
    if (f.acc >= 1) {
      f.value = Math.round(f.frames / f.acc)
      f.frames = 0
      f.acc = 0
      f.low = f.value < 45 ? f.low + 1 : 0
      if (f.low >= 2 && this.dpr > 0.75) {
        this.dpr = Math.max(0.75, this.dpr - 0.25)
        f.low = 0
        this.resize()
      }
    }
  }
}
