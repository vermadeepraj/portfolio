uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec2 uMouse;
uniform float uAspect;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float t = uTime * 0.03;
  float n = fbm(p * 1.6 + vec2(t, -t * 0.7) + fbm(p * 2.5 - t) * 0.8);

  vec2 g1 = p - vec2(0.3 * uAspect, 0.25) - uMouse * 0.05;
  vec2 g2 = p - vec2(-0.32 * uAspect, -0.35) + uMouse * 0.04;
  float glow1 = exp(-dot(g1, g1) * 3.2);
  float glow2 = exp(-dot(g2, g2) * 3.8);

  vec3 col = vec3(0.012, 0.012, 0.028);
  col += uColorA * glow1 * (0.035 + n * 0.05);
  col += uColorB * glow2 * (0.03 + n * 0.045);
  col += vec3(n * n * 0.012);
  gl_FragColor = vec4(col, 1.0);
}
