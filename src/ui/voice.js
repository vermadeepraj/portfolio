// Voice in (SpeechRecognition) and voice out (speechSynthesis), both opt-in.

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition

export const voiceSupported = !!Recognition

export function listen({ onResult, onEnd, onError }) {
  if (!Recognition) return null
  const rec = new Recognition()
  rec.lang = 'en-US'
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.onresult = (e) => onResult?.(e.results[0][0].transcript)
  rec.onerror = (e) => onError?.(e.error)
  rec.onend = () => onEnd?.()
  rec.start()
  return rec
}

export function say(text) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  const pick =
    voices.find((v) => /Google UK English Female|Samantha|Aria|Jenny/i.test(v.name)) ||
    voices.find((v) => v.lang?.startsWith('en'))
  if (pick) u.voice = pick
  u.rate = 1.02
  u.pitch = 0.9
  window.speechSynthesis.speak(u)
}
