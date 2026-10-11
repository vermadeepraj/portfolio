import './style.css'
import Lenis from 'lenis'
import { content } from './content.js'
import { renderContent } from './ui/render.js'
import { initMotion, scramble } from './ui/motion.js'
import { AudioEngine } from './ui/audio.js'
import { createMind, createMemory } from './ui/mind.js'
import { listen, say, voiceSupported } from './ui/voice.js'
import { Gestures } from './ui/gestures.js'
import { Experience } from './webgl/Experience.js'
import { buildShapes, textShape } from './webgl/shapes.js'

const SECTIONS = ['Intro', 'About', 'Experience', 'Toolkit', 'Work', 'Contact']
// Per-section particle palettes: [primary, secondary, speed-highlight].
const PALETTES = [
  ['#7cf7ff', '#8a7dff', '#ffffff'],
  ['#ff5fd2', '#7c5cff', '#ffd6f5'],
  ['#4d8bff', '#9d7bff', '#e6efff'],
  ['#54ffb0', '#2fb7ff', '#eafff5'],
  ['#ffb547', '#ff4f6d', '#fff1d6'],
  ['#a07bff', '#5ef0ff', '#ffffff'],
]
const FONT = '"Syne", "Arial Black", sans-serif'

const isMobile = matchMedia('(max-width: 820px), (hover: none)').matches
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const $ = (s) => document.querySelector(s)

renderContent(content)

const state = {
  scroll: 0,
  scrollVelocity: 0,
  pointer: { x: 0, y: 0 },
  pointerActive: false,
  accent: null,
  section: -1,
}
const audio = new AudioEngine()
const memory = createMemory()
const mind = createMind(content, memory)
let experience = null
let particleCount = 0

// ─────────────────────────────────────────────────────────────
//  Boot sequence
// ─────────────────────────────────────────────────────────────
const bootLog = $('#boot-log')
const bootFill = $('#boot-fill')
const bootPct = $('#boot-pct')
let bootProgress = 0

async function log(line, progress) {
  const row = document.createElement('div')
  bootLog.appendChild(row)
  for (let i = 0; i <= line.length; i += 2) {
    row.textContent = line.slice(0, i)
    await wait(8)
  }
  row.textContent = line
  if (progress != null) setProgress(progress)
}
function setProgress(p) {
  bootProgress = p
  bootFill.style.transform = `scaleX(${p})`
  bootPct.textContent = `${String(Math.round(p * 100)).padStart(3, '0')}%`
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

async function boot() {
  await log('> SIGNAL OS v2.6 — cold start', 0.05)
  await log(`> visitor fingerprint: session #${memory.visits}${memory.visits > 1 ? ' (returning)' : ''}`, 0.1)
  await Promise.race([document.fonts.load(`800 100px ${FONT}`), wait(2500)])
  await log('> typefaces resolved', 0.2)

  if (webglAvailable()) {
    try {
      particleCount = isMobile ? 128 * 128 : 256 * 256
      await log(`> allocating particle field ........ ${particleCount.toLocaleString()} bodies`, 0.3)
      await wait(30)
      const portrait = new Image()
      portrait.src = content.photo
      await portrait.decode()
      const shapes = buildShapes(particleCount, content.name, FONT, portrait)
      await log(`> sampling identity glyphs: "${content.name.toUpperCase()}"`, 0.45)
      await log('> reconstructing owner from photograph ........ 65,536 photons', 0.5)
      await log('> generating morph targets: portrait · neural net · globe · galaxy · portal', 0.55)
      experience = new Experience({
        canvas: $('#webgl'),
        shapes,
        palettes: PALETTES,
        state,
        isMobile,
        reducedMotion,
      })
      await log('> compiling curl-noise kernel (GLSL)', 0.7)
      experience.update(0, 1 / 60) // forces shader compilation behind the loader
      await log('> bloom · chromatic aberration · grain ........ online', 0.85)
      $('#hud-bodies').textContent = `${particleCount.toLocaleString()} bodies`
    } catch (err) {
      console.error(err)
      experience = null
    }
  }
  if (!experience) {
    document.documentElement.classList.add('no-webgl')
    await log('> WebGL2 unavailable — running in static mode', 0.85)
  }
  await log('> calibrating pointer field, audio synth, voice, optics', 0.95)
  await log('> SIGNAL is awake.', 1)
  $('#boot-enter').classList.add('show')
}

// ─────────────────────────────────────────────────────────────
//  Scroll
// ─────────────────────────────────────────────────────────────
const sections = [...document.querySelectorAll('.section')]
let centers = []
function measure() {
  centers = sections.map((el) => el.offsetTop + el.offsetHeight / 2)
}

const lenis = reducedMotion ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true })
lenis?.stop()
let lastScrollY = 0

function updateScroll(dt) {
  const y = window.scrollY
  const mid = y + innerHeight / 2
  let s = 0
  if (mid <= centers[0]) s = 0
  else if (mid >= centers[centers.length - 1]) s = centers.length - 1
  else {
    for (let i = 0; i < centers.length - 1; i++) {
      if (mid < centers[i + 1]) {
        s = i + (mid - centers[i]) / (centers[i + 1] - centers[i])
        break
      }
    }
  }
  state.scroll = s
  const v = lenis ? lenis.velocity : (y - lastScrollY) / Math.max(dt * 60, 0.001)
  state.scrollVelocity += (v - state.scrollVelocity) * 0.2
  lastScrollY = y

  const max = document.documentElement.scrollHeight - innerHeight
  $('#progress-fill').style.transform = `scaleY(${max > 0 ? y / max : 0})`

  const section = Math.round(s)
  if (section !== state.section) onSection(section)
}

function goTo(index) {
  const el = sections[Math.max(0, Math.min(sections.length - 1, index))]
  if (lenis) lenis.scrollTo(el, { duration: 1.8 })
  else el.scrollIntoView({ behavior: 'smooth' })
}

function onSection(i) {
  state.section = i
  $('#hud-index').textContent = String(i + 1).padStart(2, '0')
  const name = $('#hud-name')
  name.textContent = SECTIONS[i]
  name.dataset.text = SECTIONS[i]
  scramble(name, 600)
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', +a.dataset.nav === i))
  applyAccent()
  audio.setSection(i)
  document.body.dataset.section = i
}

function applyAccent() {
  const hex = state.accent || PALETTES[Math.max(0, state.section)][0]
  document.documentElement.style.setProperty('--accent', hex)
}

// ─────────────────────────────────────────────────────────────
//  Pointer physics: move · click (shockwave) · hold (black hole)
// ─────────────────────────────────────────────────────────────
let motion = null
let holdTimer = null
let holding = false
const isInteractive = (t) => t.closest('a, button, input, form, .console, .dock, .hand-hud')

function shock(power = 1) {
  experience?.shockwave(power)
  audio.boom(power)
}
function startHole() {
  holding = true
  experience?.setHolding(true)
  motion?.setMode('hole')
}
function endHole(silent = false) {
  if (!holding) return
  holding = false
  const held = experience?.setHolding(false) || 0
  if (!silent) audio.boom(1.5 + held * 1.2)
  motion?.setMode('')
}

addEventListener('pointermove', (e) => {
  if (gestures?.active && gestures.tracking) return
  state.pointer.x = (e.clientX / innerWidth) * 2 - 1
  state.pointer.y = -(e.clientY / innerHeight) * 2 + 1
  state.pointerActive = true
})
document.addEventListener('pointerleave', () => (state.pointerActive = false))

addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || isInteractive(e.target) || document.body.classList.contains('is-loading')) return
  holdTimer = setTimeout(() => {
    holdTimer = null
    startHole()
  }, 220)
})
addEventListener('pointerup', () => {
  if (holdTimer) {
    clearTimeout(holdTimer)
    holdTimer = null
    shock(1)
  } else endHole()
})
addEventListener('pointercancel', () => {
  clearTimeout(holdTimer)
  holdTimer = null
  endHole(true)
})

// ─────────────────────────────────────────────────────────────
//  Talk to SIGNAL
// ─────────────────────────────────────────────────────────────
const consoleEl = $('#console')
const consoleLog = $('#console-log')
const input = $('#console-input')
const SUGGESTIONS = ['who are you?', 'what do you build?', 'show me your work', 'how do I hire you?', 'black hole', 'shockwave']

$('#console-suggest').innerHTML = SUGGESTIONS.map((s) => `<button type="button" data-q="${s}">${s}</button>`).join('')
$('#console-suggest').addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]')?.dataset.q
  if (q) ask(q)
})

let idleTimer = null
function addLine(text, who) {
  const row = document.createElement('div')
  row.className = `line ${who}`
  row.textContent = text
  consoleLog.appendChild(row)
  while (consoleLog.children.length > 4) consoleLog.firstChild.remove()
  consoleEl.classList.add('has-log')
  consoleEl.classList.remove('idle')
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => consoleEl.classList.add('idle'), 9000)
  return row
}

async function typeLine(row, text) {
  row.classList.add('typing')
  for (let i = 1; i <= text.length; i++) {
    row.textContent = text.slice(0, i)
    if (i % 3 === 0) audio.tick()
    await wait(text.length > 90 ? 9 : 16)
  }
  row.classList.remove('typing')
}

let accentTimer = null
async function ask(q, { voice = false } = {}) {
  addLine(q, 'user')
  const r = mind(q)
  if (!r) return
  audio.blip(660)

  if (r.word && experience) experience.speakWord(textShape(particleCount, r.word, FONT, false), 3.4)
  if (r.goto != null) goTo(r.goto)
  if (r.accent) {
    state.accent = r.accent
    applyAccent()
    clearTimeout(accentTimer)
    accentTimer = setTimeout(() => {
      state.accent = null
      applyAccent()
    }, 4000)
  }
  if (r.action === 'shockwave') setTimeout(() => shock(3), 350)
  if (r.action === 'blackhole') {
    state.pointer.x = 0
    state.pointer.y = 0
    startHole()
    setTimeout(() => endHole(), 2600)
  }
  if (r.action === 'sound') toggleSound()
  if (r.action === 'gestures') toggleHand()
  if (r.action === 'mirror') toggleMirror()
  if (r.action === 'resume') setTimeout(() => window.open(content.resume, '_blank', 'noopener'), 600)

  if (voice) say(r.text)
  await typeLine(addLine('', 'bot'), r.text)
}

$('#console-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const q = input.value
  input.value = ''
  if (q.trim()) ask(q)
})
input.addEventListener('keydown', (e) => {
  audio.tick()
  if (e.key === 'Escape') input.blur()
})
input.addEventListener('focus', () => {
  consoleEl.classList.add('open')
  consoleEl.classList.remove('idle')
})
input.addEventListener('blur', () => setTimeout(() => consoleEl.classList.remove('open'), 150))

addEventListener('keydown', (e) => {
  if (document.activeElement === input) return
  if (e.key === 'Escape' && experience?.mirror.on) toggleMirror(false)
  else if (e.key === '/') {
    e.preventDefault()
    input.focus()
  } else if (/^[1-6]$/.test(e.key)) goTo(+e.key - 1)
})

const mic = $('#console-mic')
if (!voiceSupported) mic.remove()
else
  mic.addEventListener('click', () => {
    mic.classList.add('listening')
    listen({
      onResult: (text) => ask(text, { voice: true }),
      onEnd: () => mic.classList.remove('listening'),
      onError: () => mic.classList.remove('listening'),
    })
  })

// ─────────────────────────────────────────────────────────────
//  Controls: sound + hand tracking
// ─────────────────────────────────────────────────────────────
const soundBtn = $('#btn-sound')
function toggleSound(force) {
  const on = force ?? !audio.enabled
  if (on) audio.enable()
  else audio.disable()
  if (on) audio.setSection(Math.max(0, state.section))
  soundBtn.setAttribute('aria-pressed', on)
  soundBtn.classList.toggle('on', on)
}
soundBtn.addEventListener('click', () => toggleSound())

const handBtn = $('#btn-hand')
const handHud = $('#hand-hud')
let gestures = null
async function toggleHand() {
  if (!gestures) {
    gestures = new Gestures({
      preview: $('#hand-canvas'),
      onPointer: (p) => {
        gestures.tracking = !!p
        if (p) {
          state.pointer.x = p.x
          state.pointer.y = p.y
          state.pointerActive = true
        }
      },
      onPinch: () => shock(1.4),
      onFist: (on) => (on ? startHole() : endHole()),
      onSwipe: (dir) => goTo(state.section + dir),
      onStatus: (s) => {
        handBtn.classList.toggle('on', s === 'on')
        handBtn.classList.toggle('loading', s === 'loading')
        handBtn.setAttribute('aria-pressed', s === 'on')
        handHud.classList.toggle('show', s === 'on')
      },
    })
  }
  if (gestures.active) {
    if (experience?.mirror.on && mirrorVideo === gestures.video) toggleMirror(false)
    return gestures.stop()
  }
  try {
    await gestures.start()
    addLine('Hand tracking online. Point to steer · pinch = shockwave · fist = black hole · swipe = travel.', 'bot')
  } catch (err) {
    console.warn(err)
    gestures.onStatus('off')
    addLine('I could not access a camera. Hand control needs webcam permission.', 'bot')
  }
}
handBtn.addEventListener('click', toggleHand)

// ─────────────────────────────────────────────────────────────
//  Hologram Mirror — the field rebuilds the visitor from their webcam
// ─────────────────────────────────────────────────────────────
const mirrorBtn = $('#btn-mirror')
let mirrorStream = null
let mirrorVideo = null

async function toggleMirror(force) {
  if (!experience) return typeLine(addLine('', 'bot'), 'The Hologram Mirror needs WebGL2.')
  const on = force ?? !experience.mirror.on
  if (on === experience.mirror.on) return
  if (on) {
    try {
      mirrorBtn.classList.add('loading')
      let video = gestures?.active ? gestures.video : null
      if (!video) {
        mirrorStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        })
        video = document.createElement('video')
        video.srcObject = mirrorStream
        video.playsInline = true
        video.muted = true
        await video.play()
      }
      mirrorVideo = video
      experience.setMirror(video)
      document.body.classList.add('mirror-mode')
      mirrorBtn.classList.add('on')
      mirrorBtn.setAttribute('aria-pressed', 'true')
      audio.boom(1.2)
      typeLine(addLine('', 'bot'), "That's you now — 65,536 particles. Click to shatter your reflection, hold to collapse it. Esc to exit.")
    } catch (err) {
      console.warn(err)
      typeLine(addLine('', 'bot'), 'I could not access a camera. The mirror needs webcam permission.')
    } finally {
      mirrorBtn.classList.remove('loading')
    }
  } else {
    experience.setMirror(null)
    document.body.classList.remove('mirror-mode')
    mirrorBtn.classList.remove('on')
    mirrorBtn.setAttribute('aria-pressed', 'false')
    const stream = mirrorStream
    mirrorStream = null
    mirrorVideo = null
    if (stream) setTimeout(() => stream.getTracks().forEach((t) => t.stop()), 1500)
  }
}
mirrorBtn.addEventListener('click', () => toggleMirror())
$('#mirror-exit').addEventListener('click', () => toggleMirror(false))

// ─────────────────────────────────────────────────────────────
//  Page details
// ─────────────────────────────────────────────────────────────
document.querySelectorAll('.project a').forEach((a) => {
  a.addEventListener('pointerenter', () => {
    state.accent = a.dataset.color
    applyAccent()
    memory.remember('lastProject', a.dataset.title)
  })
  a.addEventListener('pointerleave', () => {
    state.accent = null
    applyAccent()
  })
})

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'))
    if (!target) return
    e.preventDefault()
    goTo(sections.indexOf(target))
  })
})

const emailBtn = $('#email-btn')
emailBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(content.email)
    emailBtn.querySelector('.email-hint').textContent = 'copied to clipboard ✓'
  } catch {
    location.href = `mailto:${content.email}`
  }
  shock(1.6)
  setTimeout(() => (emailBtn.querySelector('.email-hint').textContent = 'click to copy'), 2200)
})

function tickClock() {
  const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: content.timezone })
  $('#local-time').textContent = `Local time ${t}`
}
tickClock()
setInterval(tickClock, 30000)

addEventListener('resize', () => {
  experience?.resize()
  measure()
})

// ─────────────────────────────────────────────────────────────
//  Main loop
// ─────────────────────────────────────────────────────────────
let last = performance.now()
let time = 0
let hudTimer = 0
const coords = $('#hud-coords')
const fpsEl = $('#hud-fps')

function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30)
  last = now
  time += dt
  lenis?.raf(now)
  updateScroll(dt)
  experience?.update(time, dt)
  motion?.update(dt, state.scrollVelocity, getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())

  audio.setEnergy(Math.min(Math.abs(state.scrollVelocity) / 40, 1))
  if (experience) audio.setHole(experience.hole.strength)

  hudTimer += dt
  if (hudTimer > 0.1 && experience) {
    hudTimer = 0
    const p = experience.pointer
    const f = (v) => (p.x > 500 ? '+0.00' : (v >= 0 ? '+' : '') + v.toFixed(2))
    coords.textContent = `x ${f(p.x)} · y ${f(p.y)}`
    fpsEl.textContent = `${experience.fps.value} fps`
  }
  requestAnimationFrame(frame)
}

// ─────────────────────────────────────────────────────────────
//  Enter
// ─────────────────────────────────────────────────────────────
async function enter(withSound) {
  $('#boot-enter').classList.remove('show')
  if (withSound) toggleSound(true)
  document.body.classList.remove('is-loading')
  document.body.classList.add('entered')
  $('#loader').classList.add('gone')
  measure()
  lenis?.start()
  motion = initMotion({ audio })
  time = 0 // restart the simulation clock → the big bang plays on entry
  last = performance.now()
  requestAnimationFrame(frame)

  await wait(2200)
  const prev = memory.previous
  const greeting =
    prev.visits > 0
      ? `Welcome back. This is visit #${memory.visits}.${prev.lastProject ? ` Last time you lingered on ${prev.lastProject}.` : ''}`
      : "Hi — I'm SIGNAL. I'm made of particles and I can talk. Press / or tap a suggestion."
  await typeLine(addLine('', 'bot'), greeting)
}

document.querySelectorAll('.enter-btn').forEach((b) =>
  b.addEventListener('click', () => enter(b.dataset.sound === 'on')),
)

boot()
