uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uSize;
uniform float uPixelRatio;
uniform sampler2D uPhotoColors;
uniform sampler2D uVideo;
uniform float uMirror;

attribute vec2 aRef;
attribute float aSeed;

varying float vSpeed;
varying float vSeed;
varying float vDepth;
varying vec3 vPhoto;
varying vec3 vVideo;

void main() {
  vec3 pos = texture2D(uPositions, aRef).xyz;
  vec3 vel = texture2D(uVelocities, aRef).xyz;
  vSpeed = length(vel);
  vSeed = aSeed;
  vPhoto = texture2D(uPhotoColors, aRef).rgb;
  vVideo = uMirror > 0.001 ? texture2D(uVideo, vec2(1.0 - aRef.x, aRef.y)).rgb : vec3(0.0);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  vDepth = -mv.z;

  float size = uSize * (0.3 + aSeed * aSeed * 1.4);
  size *= 1.0 + min(vSpeed * 0.08, 0.8);
  gl_PointSize = size * uPixelRatio / vDepth;
}
