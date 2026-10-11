// Builds the DOM layer from content.js so the owner only edits one file.

const pad = (n) => String(n).padStart(2, '0')
const arrow = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`

export function renderContent(c) {
  document.title = `${c.name} — ${c.role}`
  document.querySelector('.logo').innerHTML = `<span data-scramble>${c.name.toUpperCase()}</span><sup>©26</sup>`
  document.querySelector('.status-text').textContent = c.available ? 'Available for work' : 'Currently booked'
  document.querySelector('.status').classList.toggle('busy', !c.available)

  const skillMarquee = c.skills.flatMap((g) => g.items)
  const marqueeRow = skillMarquee.map((s) => `<span>${s}</span><i>✦</i>`).join('')

  document.querySelector('#content').innerHTML = `
  <section class="section hero" id="hero" data-index="0">
    <h1 class="sr-only">${c.name} — ${c.role}</h1>
    <div class="hero-meta mono">
      <span data-scramble>[ SIGNAL / v2.6 ]</span>
      <span data-scramble>${c.location.toUpperCase()} — ${new Date().getFullYear()}</span>
    </div>
    <div class="hero-fallback-name" aria-hidden="true">${c.name.toUpperCase()}</div>
    <div class="hero-center">
      <p class="hero-role" data-split>${c.role}</p>
      <p class="hero-tag" data-split>${c.tagline}</p>
    </div>
    <div class="hero-hints mono">
      <span><b>Move</b> to disturb</span>
      <span><b>Click</b> for a shockwave</span>
      <span><b>Hold</b> to create a black hole</span>
      <span><b>/</b> to talk to me</span>
    </div>
    <div class="scroll-cue mono" aria-hidden="true"><span>Scroll</span><i></i></div>
  </section>

  <section class="section about" id="about" data-index="1">
    <div class="col">
      <p class="label mono" data-scramble>01 — About</p>
      <div class="id-card" data-reveal data-tilt>
        <div class="id-photo"><img src="${c.photo}" alt="Portrait of ${c.name}" width="80" height="80" /><i class="scan"></i></div>
        <div class="id-meta">
          <span class="id-name">${c.name}</span>
          <span class="id-role mono">${c.role} · ${c.location}</span>
          <span class="id-badge mono"><b></b>Verified human · rendered →</span>
        </div>
        <div class="glare"></div>
      </div>
      <h2 class="statement" data-split>${c.about.statement}</h2>
      ${c.about.paragraphs.map((p) => `<p class="body" data-reveal>${p}</p>`).join('')}
      <div class="stats">
        ${c.about.stats
          .map(
            (s) => `<div class="stat" data-reveal data-tilt>
              <div class="stat-value"><span data-count="${s.value}">0</span><em>${s.suffix}</em></div>
              <div class="stat-label mono">${s.label}</div>
            </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="section experience" id="experience" data-index="2">
    <div class="col">
      <p class="label mono" data-scramble>02 — Experience</p>
      <h2 class="heading" data-split>Where I've shipped & studied.</h2>
      <ol class="timeline" data-draw>
        ${c.experience
          .map(
            (e, i) => `<li class="t-item" data-reveal style="--d:${i * 120}ms">
              <span class="t-dot" aria-hidden="true"></span>
              <div class="t-head mono"><span class="t-period">${e.period}</span><span class="t-where">${e.where}</span></div>
              <h3 class="t-role">${e.role} <em>@ ${e.org}</em></h3>
              <ul class="t-points">${e.points.map((pt) => `<li>${pt}</li>`).join('')}</ul>
              <div class="t-tags mono">${e.tags.map((t) => `<span>${t}</span>`).join('')}</div>
            </li>`,
          )
          .join('')}
      </ol>
      <a class="resume-btn mono" href="${c.resume}" target="_blank" rel="noopener" data-magnetic data-cursor="PDF">
        Download résumé <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </a>
    </div>
  </section>

  <section class="section skills" id="skills" data-index="3">
    <div class="col">
      <p class="label mono" data-scramble>03 — Toolkit</p>
      <h2 class="heading" data-split>The instruments I play.</h2>
      <div class="skill-grid">
        ${c.skills
          .map(
            (g, gi) => `<div class="skill-card" data-reveal data-tilt style="--d:${gi * 80}ms">
              <div class="skill-head mono"><span>${pad(gi + 1)}</span><span data-scramble>${g.group}</span></div>
              <ul>${g.items.map((i) => `<li>${i}</li>`).join('')}</ul>
              <div class="glare"></div>
            </div>`,
          )
          .join('')}
      </div>
    </div>
    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">${marqueeRow}${marqueeRow}</div>
    </div>
  </section>

  <section class="section work" id="work" data-index="4">
    <div class="col wide">
      <p class="label mono" data-scramble>04 — Selected work</p>
      <h2 class="heading" data-split>Things I've brought to life.</h2>
      <ol class="projects">
        ${c.projects
          .map(
            (p, i) => `<li class="project" data-reveal style="--c:${p.color}">
              <a href="${p.url}" data-cursor="${p.repo ? 'Live demo' : 'GitHub'}" data-color="${p.color}" data-title="${p.title}" ${p.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>
                <span class="p-index mono">${pad(i + 1)}</span>
                <span class="p-main">
                  <span class="p-title" data-scramble-hover>${p.title}</span>
                  <span class="p-desc">${p.description}</span>
                </span>
                <span class="p-tags mono">${p.tags.join(' / ')}</span>
                <span class="p-year mono">${p.meta}</span>
                <span class="p-arrow">${arrow}</span>
              </a>
            </li>`,
          )
          .join('')}
      </ol>
    </div>
  </section>

  <section class="section contact" id="contact" data-index="5">
    <div class="contact-inner">
      <p class="label mono" data-scramble>05 — Contact</p>
      <h2 class="contact-heading" data-split>Let's build something <em>unreal.</em></h2>
      <button class="email-btn" id="email-btn" data-magnetic data-cursor="Copy">
        <span class="email-text">${c.email}</span>
        <span class="email-hint mono">click to copy</span>
      </button>
      <ul class="socials mono">
        ${c.socials
          .map((s) => `<li><a href="${s.url}" data-magnetic target="_blank" rel="noopener"><span data-scramble-hover>${s.label}</span>${arrow}</a></li>`)
          .join('')}
      </ul>
    </div>
    <footer class="footer mono">
      <span>© ${new Date().getFullYear()} ${c.name}</span>
      <span>Designed &amp; engineered by ${c.name} · Three.js · GPGPU · GLSL · Web Audio</span>
      <span id="local-time"></span>
    </footer>
  </section>`
}
