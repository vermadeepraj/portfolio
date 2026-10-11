uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uOpacity;
uniform float uTime;
uniform float uPhotoMix;
uniform float uMirror;

varying float vSpeed;
varying float vSeed;
varying float vDepth;
varying vec3 vPhoto;
varying vec3 vVideo;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = pow(smoothstep(0.5, 0.0, d), 1.8);

  vec3 col = mix(uColorA, uColorB, smoothstep(0.15, 0.85, vSeed));
  col = mix(col, uColorC, clamp(vSpeed * 0.18, 0.0, 1.0));

  // The owner's portrait keeps the true colours of the photo, lightly tinted.
  vec3 photo = vPhoto * 2.1 + uColorA * 0.06;
  col = mix(col, photo, uPhotoMix * 0.88);

  // Mirror: dark pixels fade out so only the lit face/figure glows.
  vec3 vid = vVideo;
  float vl = dot(vid, vec3(0.299, 0.587, 0.114));
  col = mix(col, vid * 2.2 + uColorA * 0.1, uMirror * 0.8);
  alpha *= mix(1.0, smoothstep(0.02, 0.5, vl) * 1.7 + 0.02, uMirror);

  float twinkle = 0.75 + 0.25 * sin(uTime * 2.3 + vSeed * 91.0);
  float fog = smoothstep(22.0, 6.0, vDepth);
  gl_FragColor = vec4(col * alpha * twinkle * fog * uOpacity * 0.62, 1.0);
}
