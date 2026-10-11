// DOM motion system: glyph-decode text, word reveals, magnetic + tilt
// interactions, count-ups, velocity-skewed marquee, cursor with comet trail.

const GLYPHS = '!<>-_\\/[]{}—=+*^?#$%&01ΔΣΩ∆◊░▒▓'
const lerp = (a, b, t) => a + (b - a) * t
const isTouch = matchMedia('(hover: none)').matches

// ── Glyph-decode ("scramble") ────────────────────────────────
export function scramble(el, duration = 900) {
  const final = el.dataset.text || (el.dataset.text = el.textContent)
  const start = performance.now()
  const order = [...final].map(() => Math.random() * 0.6)
  cancelAnimationFrame(el._scr)
  const frame = (now) => {
    const p = Math.min(1, (now - start) / duration)
    let out = ''
    for (let i = 0; i < final.length; i++) {
      const ch = final[i]
      if (ch === ' ' || p >= order[i] + 0.4 * (i / final.length) + 0.1) out += ch
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0]
    }
    el.textContent = out
    if (p < 1) el._scr = requestAnimationFrame(frame)
    else el.textContent = final
  }
  el._scr = requestAnimationFrame(frame)
}

// ── Split text into words for staggered reveals ──────────────
function splitWords(el) {
  let i = 0
  const walk = (node) => {
    ;[...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment()
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '))
          const w = document.createElement('span')
          w.className = 'w'
          const inner = document.createElement('span')
          inner.style.setProperty('--i', i++)
          inner.textContent = part
          w.appendChild(inner)
          frag.appendChild(w)
        })
        child.replaceWith(frag)
      } else if (child.nodeType === 1) walk(child)
    })
  }
  walk(el)
}

function countUp(el) {
  const target = parseFloat(el.dataset.count)
  const start = performance.now()
  const dur = 1600
  const frame = (now) => {
    const p = Math.min(1, (now - start) / dur)
    const e = 1 - Math.pow(1 - p, 4)
    el.textContent = Math.round(target * e)
    if (p < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

export function initMotion({ audio }) {
  // Reveal choreography.
  document.querySelectorAll('[data-split]').forEach(splitWords)
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        const el = e.target
        el.classList.add('in')
        if (el.hasAttribute('data-scramble')) scramble(el, 1100)
        el.querySelectorAll?.('[data-count]').forEach(countUp)
        io.unobserve(el)
      })
    },
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
  )
  document.querySelectorAll('[data-split], [data-reveal], [data-scramble], [data-draw]').forEach((el) => io.observe(el))

  // Decode on hover.
  document.querySelectorAll('[data-scramble-hover]').forEach((el) => {
    const host = el.closest('a, button') || el
    host.addEventListener('pointerenter', () => scramble(el, 500))
  })

  if (isTouch) return { update() {} }

  // Magnetic elements.
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      el.style.transform = `translate(${x * 0.28}px, ${y * 0.38}px)`
    })
    el.addEventListener('pointerleave', () => (el.style.transform = ''))
  })

  // 3D tilt + glare.
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      el.style.setProperty('--rx', `${(0.5 - py) * 12}deg`)
      el.style.setProperty('--ry', `${(px - 0.5) * 14}deg`)
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
    })
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    })
  })

  // Cursor.
  const cursor = document.querySelector('.cursor')
  const ring = cursor.querySelector('.cursor-ring')
  const dot = cursor.querySelector('.cursor-dot')
  const label = cursor.querySelector('.cursor-label')
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }
  const ringPos = { ...pos }
  let visible = false

  addEventListener('pointermove', (e) => {
    pos.x = e.clientX
    pos.y = e.clientY
    if (!visible) {
      visible = true
      cursor.classList.add('on')
    }
  })
  document.addEventListener('pointerleave', () => {
    visible = false
    cursor.classList.remove('on')
  })

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, input, [data-cursor]')
    cursor.classList.toggle('hover', !!t)
    const text = t?.dataset.cursor || ''
    label.textContent = text
    cursor.classList.toggle('labelled', !!text)
    if (t && t !== cursor._last) audio.blip(1200 + Math.random() * 400)
    cursor._last = t
  })

  // Comet trail on a 2D canvas.
  const trail = document.getElementById('trail')
  const tctx = trail.getContext('2d')
  const points = []
  const resize = () => {
    const d = Math.min(devicePixelRatio, 2)
    trail.width = innerWidth * d
    trail.height = innerHeight * d
    tctx.setTransform(d, 0, 0, d, 0, 0)
  }
  resize()
  addEventListener('resize', resize)

  return {
    update(dt, scrollVelocity, accent) {
      const k = 1 - Math.exp(-18 * dt)
      ringPos.x = lerp(ringPos.x, pos.x, k)
      ringPos.y = lerp(ringPos.y, pos.y, k)
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px)`

      points.push({ x: pos.x, y: pos.y })
      if (points.length > 22) points.shift()
      tctx.clearRect(0, 0, innerWidth, innerHeight)
      if (visible && points.length > 2) {
        tctx.globalCompositeOperation = 'lighter'
        tctx.lineCap = 'round'
        for (let i = 1; i < points.length; i++) {
          const t = i / points.length
          tctx.strokeStyle = accent
          tctx.globalAlpha = t * 0.35
          tctx.lineWidth = t * 3
          tctx.beginPath()
          tctx.moveTo(points[i - 1].x, points[i - 1].y)
          tctx.lineTo(points[i].x, points[i].y)
          tctx.stroke()
        }
        tctx.globalAlpha = 1
      }

      // Velocity skew for the marquee + headings.
      const skew = Math.max(-12, Math.min(12, scrollVelocity * 0.25))
      document.documentElement.style.setProperty('--skew', `${skew.toFixed(2)}deg`)
    },
    setMode(mode) {
      cursor.dataset.mode = mode || ''
    },
  }
}
