// SIGNAL's "mind": local intent matching over content.js. No API, no keys.
// Returns { text, word?, goto?, action? } — `word` is spelled by the particles.

const has = (t, ...words) => words.some((w) => t.includes(w))

export function createMind(content, memory) {
  const skills = content.skills.flatMap((g) => g.items)
  const first = content.name.split(' ')[0]

  return function respond(raw) {
    const t = ` ${raw.toLowerCase().trim()} `

    if (!raw.trim()) return null

    if (has(t, ' help ', 'what can you do', 'commands') || raw.trim() === '?') {
      return {
        text: 'Ask me about: about · experience · education · skills · work · a project by name · résumé · contact · time. Or command me: mirror · shockwave · black hole · gestures · sound · top.',
        word: 'HELP',
      }
    }

    if (/^\s*(hi|hello|hey|yo|namaste|hola|sup)\b/.test(t)) {
      const back = memory.visits > 1 ? ` Welcome back — this is visit #${memory.visits}.` : ''
      return { text: `Hello, human. I am SIGNAL — ${first}'s portfolio, rendered as 65,536 living particles.${back}`, word: 'HELLO' }
    }

    if (has(t, 'who are you', 'what are you', 'signal', 'are you alive', 'are you ai')) {
      return {
        text: `I'm a GPU particle simulation with opinions. Every dot you see is integrated on the graphics card 60 times a second. ${first} built me.`,
        word: 'SIGNAL',
      }
    }

    if (has(t, 'shock', 'boom', 'explode', 'blast', 'bang')) {
      return { text: 'Brace yourself.', action: 'shockwave' }
    }
    if (has(t, 'black hole', 'blackhole', 'singularity', 'gravity', 'hole')) {
      return { text: 'Collapsing the field into a singularity… tip: hold your mouse button anywhere to do it yourself.', action: 'blackhole' }
    }
    if (has(t, 'mirror', 'hologram', 'see me', 'my face', 'reflection', 'show me myself', 'become')) {
      return { text: 'Opening the Hologram Mirror — I will rebuild you from your webcam, one particle per pixel.', action: 'mirror' }
    }
    if (has(t, 'gesture', 'hand', 'camera', 'webcam')) {
      return { text: 'Toggling hand control. Point to steer, pinch for a shockwave, make a fist for a black hole, swipe to travel.', action: 'gestures' }
    }
    if (has(t, 'sound', 'audio', 'music', 'mute', 'unmute')) {
      return { text: 'Toggling the generative soundscape — every sound is synthesised live, no audio files.', action: 'sound' }
    }
    if (has(t, ' top', 'home', 'start', 'beginning')) {
      return { text: 'Returning to origin.', goto: 0, word: content.name.toUpperCase().slice(0, 9) }
    }

    if (has(t, 'resume', 'résumé', ' cv', 'curriculum')) {
      return { text: `Opening ${first}'s résumé (PDF).`, word: 'RESUME', action: 'resume' }
    }
    const job = content.experience[0]
    if (has(t, 'experience', 'intern', 'flyzygo', 'worked', 'company', 'job history', 'career')) {
      return { text: `${job.role} at ${job.org} (${job.period}): ${job.points[0]}`, word: job.org.toUpperCase().slice(0, 9), goto: 2 }
    }
    const edu = content.experience[1]
    if (has(t, 'education', 'college', 'mnit', 'cgpa', 'degree', 'study', 'studies', 'university', 'b.tech', 'btech')) {
      return { text: `${edu.role} at ${edu.where} (${edu.period}). ${edu.points[0]}`, word: 'MNIT', goto: 2 }
    }

    const project = content.projects.find((p) => t.includes(p.title.toLowerCase()) || t.includes(p.title.split(' ')[0].toLowerCase()))
    if (project) {
      memory.remember('lastProject', project.title)
      return { text: `${project.title} (${project.meta}) — ${project.description}${project.repo ? ' Code: ' + project.repo : ''}`, word: project.title.split(' ')[0].toUpperCase().slice(0, 9), goto: 4, accent: project.color }
    }

    // "Next.js 14" / "JavaScript (ES6+)" → "next" / "javascript", so casual queries match.
    const norm = (x) => x.toLowerCase().replace(/\(.*?\)/g, '').replace(/\.js\b/g, '').replace(/\b\d+(\.\d+)?\b/g, '').replace(/[^a-z0-9+#]/g, '')
    const flat = norm(t)
    const skill = skills.find((s) => norm(s).length > 1 && flat.includes(norm(s)))
    if (skill) {
      return { text: `Yes — ${skill} is part of my toolkit.`, word: skill.toUpperCase().replace(/\s.*$/, '').replace(/\(.*$/, '').slice(0, 10), goto: 3 }
    }

    if (has(t, 'skill', 'stack', 'tech', 'tool', 'know', 'language', 'build with', 'do you build', 'do you do', ' use')) {
      return { text: `My core stack: ${skills.slice(0, 8).join(', ')} — and more.`, word: 'STACK', goto: 3 }
    }
    if (has(t, 'work', 'project', 'portfolio', 'made', 'built', 'case', 'build')) {
      const names = content.projects.map((p) => p.title).join(' · ')
      return { text: `Selected work: ${names}. Hover one to recolour the universe.`, word: 'WORK', goto: 4 }
    }
    if (has(t, 'about', 'who is', 'yourself', 'bio', 'background', 'story', first.toLowerCase())) {
      return { text: `That's ${first} — rebuilt from a photograph, particle by particle. ${content.about.statement}`, goto: 1 }
    }
    if (has(t, 'contact', 'hire', 'email', 'mail', 'reach', 'available', 'freelance', 'job', 'collab', 'talk')) {
      return {
        text: `${content.available ? 'Currently open to new projects.' : 'Always happy to talk.'} Write to ${content.email}.`,
        word: 'HIRE ME',
        goto: 5,
      }
    }
    if (has(t, 'time', 'where', 'location', 'based')) {
      const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: content.timezone })
      return { text: `${first} is based in ${content.location}. Local time there: ${time}.`, word: time }
    }
    if (has(t, 'thank', 'thx', 'cool', 'nice', 'awesome', 'wow', 'love')) {
      return { text: 'The particles are blushing. Thank you.', word: '♥' }
    }

    return {
      text: "That's beyond my few thousand particles of vocabulary. Try: skills · work · contact · black hole · help.",
      word: '?',
    }
  }
}

// Visitor memory across sessions (per-browser convenience only).
export function createMemory() {
  let data = { visits: 0, lastProject: null, lastVisit: null }
  try {
    data = { ...data, ...JSON.parse(localStorage.getItem('signal:memory') || '{}') }
  } catch {}
  const previous = { ...data }
  data.visits += 1
  data.lastVisit = Date.now()
  const save = () => {
    try {
      localStorage.setItem('signal:memory', JSON.stringify(data))
    } catch {}
  }
  save()
  return {
    get visits() {
      return data.visits
    },
    previous,
    remember(key, value) {
      data[key] = value
      save()
    },
  }
}
