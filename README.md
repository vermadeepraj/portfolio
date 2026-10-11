# SIGNAL — a living portfolio

65,536 particles simulated on the GPU that morph as you scroll, react to your cursor, voice and hand, and spell out their answers.

## Run
```
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Make it yours
Edit **`src/content.js`**: name, role, bio, skills, projects (each `color` tints the universe on hover), socials, email.
The hero's particle name is generated from `name` automatically.
`photo` (`public/portrait.webp`, background already removed) becomes the About particle portrait and the ID card. To swap it, use a PNG/WebP with a transparent background.

## Interactions
| Input | Effect |
|---|---|
| Move | Particles flee and are dragged by the pointer |
| Click | Shockwave |
| Hold | Black hole — release for a supernova (longer hold = bigger blast) |
| `/` | Talk to SIGNAL — particles spell the answer |
| `1`–`5` | Jump between sections |
| Mic button | Ask by voice (Chrome/Edge) — it answers aloud |
| Hand button | Webcam hand control: point · pinch = shockwave · fist = black hole · swipe = travel |
| Mirror button | **Hologram Mirror**: the particles rebuild the *visitor* live from their webcam as a 3D relief (Esc to exit) |
| Sound button | Generative soundscape (fully synthesised, no audio files) |

## Where things live
- `src/webgl/shaders/velocity.frag` — the physics (spring, curl noise, pointer, shockwave, black hole, speech)
- `src/webgl/shapes.js` — shapes (name, photo portrait, globe, galaxy, portal)
- `src/webgl/Experience.js` — scene, layout, post-processing, adaptive quality
- `src/ui/mind.js` — what SIGNAL understands and replies
- `src/ui/audio.js` · `gestures.js` · `voice.js` · `motion.js` — sound, hand tracking, voice, DOM motion
