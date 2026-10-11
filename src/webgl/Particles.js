import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import noiseGlsl from './shaders/noise.glsl?raw'
import velocityFrag from './shaders/velocity.frag?raw'
import positionFrag from './shaders/position.frag?raw'
import particlesVert from './shaders/particles.vert?raw'
import particlesFrag from './shaders/particles.frag?raw'

// 65k-body particle field simulated entirely on the GPU:
// velocity + position live in float textures, ping-ponged every frame.
export class Particles {
  constructor(renderer, { size, shapes, halfFloat = false }) {
    this.size = size
    this.count = size * size

    const gpgpu = new GPUComputationRenderer(size, size, renderer)
    if (halfFloat) gpgpu.setDataType(THREE.HalfFloatType)
    this.gpgpu = gpgpu

    // Big-bang start: everything packed in a tiny sphere, flying outward.
    const pos0 = gpgpu.createTexture()
    const vel0 = gpgpu.createTexture()
    const p = pos0.image.data
    const v = vel0.image.data
    for (let i = 0; i < this.count; i++) {
      const u = Math.random() * 2 - 1
      const a = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const dx = s * Math.cos(a), dy = u, dz = s * Math.sin(a)
      const r = Math.random() * 0.05
      const speed = 3 + Math.random() * 9
      p.set([dx * r, dy * r, dz * r, 1], i * 4)
      v.set([dx * speed, dy * speed, dz * speed, 1], i * 4)
    }

    this.velVar = gpgpu.addVariable('textureVelocity', velocityFrag.replace('#include <noise>', noiseGlsl), vel0)
    this.posVar = gpgpu.addVariable('texturePosition', positionFrag, pos0)
    gpgpu.setVariableDependencies(this.velVar, [this.velVar, this.posVar])
    gpgpu.setVariableDependencies(this.posVar, [this.velVar, this.posVar])

    this.targets = shapes.map((s) => this.makeTexture(s.data))
    this.speakTexture = this.makeTexture(new Float32Array(shapes[0].data))
    const photo = shapes.find((s) => s.colors)
    this.photoTexture = this.makeTexture(photo ? photo.colors : new Float32Array(this.count * 4))
    // Placeholder until a webcam stream is attached.
    this.blankVideo = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    this.blankVideo.needsUpdate = true

    this.uniforms = this.velVar.material.uniforms
    Object.assign(this.uniforms, {
      uTime: { value: 0 },
      uDelta: { value: 0 },
      uTargetA: { value: this.targets[0] },
      uTargetB: { value: this.targets[1] },
      uMorph: { value: 0 },
      uOffsetA: { value: new THREE.Vector3() },
      uOffsetB: { value: new THREE.Vector3() },
      uXformA: { value: new THREE.Vector3(0, 0, 1) },
      uXformB: { value: new THREE.Vector3(0, 0, 1) },
      uMouse: { value: new THREE.Vector3(999, 999, 0) },
      uMouseVel: { value: new THREE.Vector3() },
      uMouseForce: { value: 0 },
      uShock: { value: new THREE.Vector4(0, 0, 0, -100) },
      uShockPower: { value: 1 },
      uTurbulence: { value: 0.6 },
      uSpring: { value: 14 },
      uDamping: { value: 4.6 },
      uSpeakTarget: { value: this.speakTexture },
      uSpeak: { value: 0 },
      uSpeakXform: { value: new THREE.Vector3(1, 0, 0) },
      uHole: { value: new THREE.Vector4(0, 0, 0, 0) },
      uVideo: { value: this.blankVideo },
      uMirror: { value: 0 },
      uMirrorRect: { value: new THREE.Vector4(6.4, 4.8, 0, 0) },
    })
    this.posVar.material.uniforms.uDelta = { value: 0 }

    const error = gpgpu.init()
    if (error) throw new Error(error)

    // Render geometry: one vertex per texel, positions fetched in the vertex shader.
    const geometry = new THREE.BufferGeometry()
    const refs = new Float32Array(this.count * 2)
    const seeds = new Float32Array(this.count)
    for (let i = 0; i < this.count; i++) {
      refs[i * 2] = ((i % size) + 0.5) / size
      refs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size
      seeds[i] = Math.random()
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.count * 3), 3))
    geometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader: particlesVert,
      fragmentShader: particlesFrag,
      uniforms: {
        uPositions: { value: null },
        uVelocities: { value: null },
        uSize: { value: 30 },
        uPixelRatio: { value: 1 },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uColorA: { value: new THREE.Color() },
        uColorB: { value: new THREE.Color() },
        uColorC: { value: new THREE.Color() },
        uPhotoColors: { value: this.photoTexture },
        uPhotoMix: { value: 0 },
        uVideo: { value: this.blankVideo },
        uMirror: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(geometry, this.material)
    this.points.frustumCulled = false
  }

  makeTexture(data) {
    const t = new THREE.DataTexture(data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType)
    t.needsUpdate = true
    return t
  }

  setSpeakShape(data) {
    this.speakTexture.image.data.set(data)
    this.speakTexture.needsUpdate = true
  }

  setVideo(texture) {
    const t = texture || this.blankVideo
    this.uniforms.uVideo.value = t
    this.material.uniforms.uVideo.value = t
  }

  update(time, dt) {
    this.uniforms.uTime.value = time
    this.uniforms.uDelta.value = dt
    this.posVar.material.uniforms.uDelta.value = dt
    this.gpgpu.compute()
    this.material.uniforms.uPositions.value = this.gpgpu.getCurrentRenderTarget(this.posVar).texture
    this.material.uniforms.uVelocities.value = this.gpgpu.getCurrentRenderTarget(this.velVar).texture
    this.material.uniforms.uTime.value = time
  }
}
