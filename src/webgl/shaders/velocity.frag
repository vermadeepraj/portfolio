// GPGPU velocity integration.
// Forces: spring to a morphing target shape, curl-noise turbulence,
// pointer repulsion + drag, and an expanding shockwave ring.
uniform float uTime;
uniform float uDelta;
uniform sampler2D uTargetA;
uniform sampler2D uTargetB;
uniform float uMorph;
uniform vec3 uOffsetA;
uniform vec3 uOffsetB;
uniform vec3 uXformA; // x: spin (rotY), y: tilt (rotX), z: scale
uniform vec3 uXformB;
uniform vec3 uMouse;
uniform vec3 uMouseVel;
uniform float uMouseForce;
uniform vec4 uShock; // xyz: origin, w: start time
uniform float uTurbulence;
uniform float uSpring;
uniform float uDamping;
uniform sampler2D uSpeakTarget;
uniform float uSpeak;
uniform vec3 uSpeakXform; // x: scale, yz: offset xy
uniform vec4 uHole;       // xyz: singularity position, w: strength 0..1
uniform float uShockPower;
uniform sampler2D uVideo;   // visitor's webcam (Hologram Mirror)
uniform float uMirror;      // 0..1
uniform vec4 uMirrorRect;   // xy: size, zw: centre

#include <noise>

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 xform(vec3 p, vec3 x, vec3 offset) {
  p *= x.z;
  float c = cos(x.x), s = sin(x.x);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  c = cos(x.y); s = sin(x.y);
  p = vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
  return p + offset;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  float seed = hash12(gl_FragCoord.xy);
  float dt = uDelta;

  // Staggered morph: every particle departs at its own moment.
  vec3 ta = xform(texture2D(uTargetA, uv).xyz, uXformA, uOffsetA);
  vec3 tb = xform(texture2D(uTargetB, uv).xyz, uXformB, uOffsetB);
  float start = seed * 0.45;
  float m = smoothstep(start, start + 0.55, uMorph);
  vec3 target = mix(ta, tb, m);
  float transit = sin(m * 3.14159265);

  // "Speaking": particles break formation and spell a word.
  vec3 ts = texture2D(uSpeakTarget, uv).xyz * uSpeakXform.x + vec3(uSpeakXform.yz, 0.3);
  float sp = smoothstep(seed * 0.35, seed * 0.35 + 0.65, uSpeak);
  target = mix(target, ts, sp);
  transit = max(transit, sin(sp * 3.14159265) * 0.8);

  // Hologram Mirror: every particle owns one video pixel (its own texel uv),
  // brightness pushes it toward the camera → a live 3D relief of the visitor.
  if (uMirror > 0.001) {
    vec3 vid = texture2D(uVideo, vec2(1.0 - uv.x, uv.y)).rgb;
    float l = dot(vid, vec3(0.299, 0.587, 0.114));
    vec3 tm = vec3((uv - 0.5) * uMirrorRect.xy + uMirrorRect.zw, l * 1.6 - 0.3);
    float mm = smoothstep(seed * 0.4, seed * 0.4 + 0.6, uMirror);
    target = mix(target, tm, mm);
    transit = max(transit, sin(mm * 3.14159265) * 0.9);
  }

  vec3 acc = (target - pos) * uSpring * (0.55 + seed * 0.9);

  vec3 n = curlNoise(pos * 0.32 + vec3(0.0, uTime * 0.07, uTime * 0.03));
  acc += n * (uTurbulence + transit * 3.2) * (0.6 + seed * 0.8);

  // Black hole: the spring lets go, gravity + orbital swirl take over.
  if (uHole.w > 0.001) {
    vec3 dh = uHole.xyz - pos;
    float l = length(dh) + 0.05;
    vec3 dir = dh / l;
    float w = uHole.w;
    acc -= (target - pos) * uSpring * (0.55 + seed * 0.9) * w * 0.92;
    acc += dir * w * 34.0 / (l * 0.7 + 0.35);
    acc += normalize(cross(dir, vec3(0.15, 0.25, 1.0))) * w * 26.0 / (l + 0.25);
  }

  // Pointer: radial push plus drag along the pointer's motion.
  vec3 dm = pos - uMouse;
  float dl = length(dm);
  float falloff = exp(-dl * dl * 1.4);
  acc += (dm / (dl + 1e-4)) * uMouseForce * falloff;
  acc += uMouseVel * falloff * 2.2 * step(0.01, uMouseForce);

  // Shockwave ring.
  float age = uTime - uShock.w;
  if (age > 0.0 && age < 3.0) {
    vec3 ds = pos - uShock.xyz;
    float dsl = length(ds);
    float radius = age * 6.0;
    float ring = exp(-pow((dsl - radius) * 1.5, 2.0)) * exp(-age * 1.3);
    acc += (ds / (dsl + 1e-4)) * ring * 70.0 * uShockPower;
    acc.z += ring * 25.0 * uShockPower * (seed - 0.3);
  }

  vel += acc * dt;
  vel *= exp(-uDamping * dt);
  gl_FragColor = vec4(vel, 1.0);
}
