// Radial chromatic aberration, vignette and animated film grain.
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uAberration;
uniform vec2 uResolution;
varying vec2 vUv;

float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 dir = vUv - 0.5;
  float d = length(dir);
  vec2 off = dir * uAberration * (0.4 + d * 1.6);
  vec3 col;
  col.r = texture2D(tDiffuse, vUv + off).r;
  col.g = texture2D(tDiffuse, vUv).g;
  col.b = texture2D(tDiffuse, vUv - off).b;

  col *= mix(1.0, smoothstep(0.95, 0.2, d), 0.55);
  float grain = rand(vUv * uResolution + fract(uTime * 7.13) * 100.0) - 0.5;
  col += grain * 0.04;
  gl_FragColor = vec4(col, 1.0);
}
