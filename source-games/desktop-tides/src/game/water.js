// A deliberately small water pass. The illustrated seabed supplies the detail;
// this shader adds only slow refraction, local touch response, and light shimmer.
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

function fragmentSource(rippleLimit, currentLimit, precision) {
  return `
precision ${precision} float;
varying vec2 v_uv;
uniform sampler2D u_day;
uniform sampler2D u_night;
uniform vec2 u_size;
uniform vec2 u_offset;
uniform float u_scale;
uniform float u_time;
uniform float u_nightMix;
uniform float u_motion;
uniform float u_rippleCount;
uniform float u_currentCount;
uniform vec4 u_ripples[${rippleLimit}];
uniform vec4 u_currents[${currentLimit}];
uniform vec2 u_directions[${currentLimit}];

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 world = (v_uv * u_size - u_offset) / max(u_scale, 0.0001);
  vec2 uv = world / vec2(1600.0, 900.0);
  // The sand, leaves, and dry shoreline must remain stationary.
  float water = smoothstep(1.02, 1.23, world.x / 432.0 + world.y / 387.0);
  float t = u_time;
  vec2 p = world * 0.009;
  float n1 = noise(p + vec2(t * 0.045, -t * 0.032));
  float n2 = noise(p * 1.29 + vec2(8.4 - t * 0.028, t * 0.037));
  vec2 drift = vec2(n1 - 0.5, n2 - 0.5) * 2.3 * u_motion;
  drift += vec2(sin(world.y * 0.018 + t * 0.37),
                cos(world.x * 0.015 - t * 0.29)) * 0.26 * u_motion;

  float touchLight = 0.0;
  for (int i = 0; i < ${rippleLimit}; i++) {
    if (float(i) >= u_rippleCount) break;
    vec4 ripple = u_ripples[i];
    vec2 delta = world - ripple.xy;
    float distanceToCenter = length(delta);
    float edge = distanceToCenter - ripple.z;
    float envelope = exp(-abs(edge) * 0.052) * ripple.w;
    vec2 outward = delta / max(distanceToCenter, 0.5);
    drift += outward * sin(edge * 0.22) * envelope * 2.1;
    touchLight += exp(-edge * edge * 0.014) * ripple.w * 0.018;
  }
  for (int i = 0; i < ${currentLimit}; i++) {
    if (float(i) >= u_currentCount) break;
    vec4 current = u_currents[i];
    float falloff = max(0.0, 1.0 - length(world - current.xy) / max(current.z, 1.0));
    drift -= u_directions[i] * falloff * falloff * current.w * 2.6;
  }

  // Displacement is measured in world pixels, independent of screen resolution.
  vec2 sampleUv = clamp(uv + drift * water / vec2(1600.0, 900.0),
                       vec2(0.0001), vec2(0.9999));
  vec3 dayColor = texture2D(u_day, sampleUv).rgb;
  vec3 nightColor = texture2D(u_night, sampleUv).rgb;
  vec3 color = mix(dayColor, nightColor, u_nightMix);

  // Broad, irregular shimmer avoids the rigid line/grid look of simple sine caustics.
  float fineNoise = noise(p * 3.1 + vec2(-t * 0.061, t * 0.04));
  float shallow = 1.0 - smoothstep(0.12, 0.84, uv.x);
  float shimmer = (n1 + n2 + fineNoise - 1.5) * 0.019;
  color *= 1.0 + shimmer * water * u_motion * mix(1.0, 0.6, u_nightMix);
  color += vec3(0.52, 0.91, 0.92) * touchLight * water;
  float coast = exp(-abs(world.x / 432.0 + world.y / 387.0 - 1.20) * 14.0);
  color += vec3(0.08, 0.8, 0.83) * coast * u_nightMix *
           (0.012 + 0.008 * sin(t * 0.57 + world.y * 0.024)) * water * u_motion;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;
}

export function createWaterRenderer(canvas, { day, night: nightImage }) {
  let gl = null;
  let resources = null;
  let kind = 'canvas2d';
  let disposed = false;
  let lost = false;
  let warned = false;
  let fallbackCanvas = null;
  let fallbackContext = null;
  let latestState = null;
  const originalVisibility = canvas.style?.visibility || '';

  function warnOnce(error) {
    if (warned) return;
    warned = true;
    console.warn('Water renderer is using the compatible canvas mode.', error?.message || error || 'WebGL unavailable');
  }

  function releaseResources() {
    if (!gl || !resources || lost) { resources = null; return; }
    for (const texture of resources.textures) gl.deleteTexture(texture);
    gl.deleteBuffer(resources.buffer);
    gl.deleteProgram(resources.program);
    resources = null;
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate water shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Water shader compilation failed';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function makeTexture(image, unit) {
    const texture = gl.createTexture();
    if (!texture) throw new Error('Unable to allocate water texture');
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); }
    catch (error) { gl.deleteTexture(texture); throw error; }
    return texture;
  }

  function initializeWebGL() {
    if (disposed) return false;
    const attributes = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
    gl ||= canvas.getContext('webgl', attributes) || canvas.getContext('experimental-webgl', attributes);
    if (!gl) throw new Error('WebGL is unavailable');
    const uniformsAvailable = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    const rippleLimit = uniformsAvailable < 64 ? 4 : 12;
    const currentLimit = uniformsAvailable < 64 ? 4 : 16;
    const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    let fragment;
    try { fragment = compile(gl.FRAGMENT_SHADER, fragmentSource(rippleLimit, currentLimit, highp?.precision ? 'highp' : 'mediump')); }
    catch (error) { gl.deleteShader(vertex); throw error; }
    const program = gl.createProgram();
    if (!program) { gl.deleteShader(vertex); gl.deleteShader(fragment); throw new Error('Unable to allocate water program'); }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unable to link water shader';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    const buffer = gl.createBuffer();
    const textures = [];
    resources = { program, buffer, textures, rippleLimit, currentLimit };
    if (!buffer) { releaseResources(); throw new Error('Unable to allocate water quad'); }
    try {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      textures.push(makeTexture(day, 0));
      textures.push(makeTexture(nightImage || day, 1));
      resources.uniforms = Object.fromEntries([
        'u_day', 'u_night', 'u_size', 'u_offset', 'u_scale', 'u_time', 'u_nightMix', 'u_motion',
        'u_rippleCount', 'u_currentCount', 'u_ripples[0]', 'u_currents[0]', 'u_directions[0]',
      ].map(name => [name, gl.getUniformLocation(program, name)]));
      resources.rippleData = new Float32Array(rippleLimit * 4);
      resources.currentData = new Float32Array(currentLimit * 4);
      resources.directionData = new Float32Array(currentLimit * 2);
      resources.maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096;
      gl.uniform1i(resources.uniforms.u_day, 0);
      gl.uniform1i(resources.uniforms.u_night, 1);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      kind = 'webgl';
      if (fallbackCanvas && fallbackCanvas !== canvas) fallbackCanvas.style.display = 'none';
      if (canvas.style) canvas.style.visibility = originalVisibility;
      return true;
    } catch (error) { releaseResources(); throw error; }
  }

  function enableFallback(error) {
    kind = 'canvas2d';
    warnOnce(error);
    if (!fallbackContext) {
      // A canvas that has already had a WebGL context cannot switch context types.
      // A sibling keeps the visual alive during context loss or a shader failure.
      if (!gl) {
        fallbackCanvas = canvas;
        try { fallbackContext = canvas.getContext('2d', { alpha: false }); } catch { /* DOM may be gone. */ }
      }
      if (!fallbackContext && canvas.ownerDocument && canvas.parentNode) {
        fallbackCanvas = canvas.ownerDocument.createElement('canvas');
        fallbackCanvas.className = canvas.className;
        fallbackCanvas.style.cssText = canvas.style?.cssText || '';
        Object.assign(fallbackCanvas.style, {
          position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none',
        });
        fallbackCanvas.setAttribute('aria-hidden', 'true');
        fallbackCanvas.dataset.waterFallback = 'true';
        canvas.parentNode.insertBefore(fallbackCanvas, canvas.nextSibling);
        fallbackContext = fallbackCanvas.getContext('2d', { alpha: false });
      }
    }
    if (fallbackCanvas && fallbackCanvas !== canvas) {
      fallbackCanvas.style.display = '';
      if (canvas.style) canvas.style.visibility = 'hidden';
    }
  }

  function resize(target, width, height, maxSize = 8192) {
    const pixelRatio = clamp(number(globalThis.devicePixelRatio, 1), 1, 1.5);
    const ratio = Math.min(pixelRatio, maxSize / width, maxSize / height);
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (target.width !== pixelWidth) target.width = pixelWidth;
    if (target.height !== pixelHeight) target.height = pixelHeight;
    return ratio;
  }

  function renderFallback(state) {
    if (!fallbackCanvas || !fallbackContext) return;
    const { width, height, view, night } = state;
    const ratio = resize(fallbackCanvas, width, height);
    const context = fallbackContext;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalAlpha = 1;
    context.fillStyle = '#06334c';
    context.fillRect(0, 0, width, height);
    context.drawImage(day, view.offsetX, view.offsetY, WORLD_WIDTH * view.scale, WORLD_HEIGHT * view.scale);
    if (night > 0 && nightImage) {
      context.globalAlpha = night;
      context.drawImage(nightImage, view.offsetX, view.offsetY, WORLD_WIDTH * view.scale, WORLD_HEIGHT * view.scale);
      context.globalAlpha = 1;
    }
  }

  function render(input) {
    if (disposed) return;
    const width = Math.max(1, number(input.width, 1));
    const height = Math.max(1, number(input.height, 1));
    const defaultScale = Math.max(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    const view = {
      scale: Math.max(0.0001, number(input.view?.scale, defaultScale)),
      offsetX: number(input.view?.offsetX, 0),
      offsetY: number(input.view?.offsetY, 0),
    };
    const state = {
      ...input, width, height, view, night: clamp(number(input.night), 0, 1),
      time: number(input.time), ripples: input.ripples || [], currents: input.currents || [],
    };
    latestState = state;
    if (kind !== 'webgl' || lost || !resources) { renderFallback(state); return; }
    try {
      resize(canvas, width, height, resources.maxSize);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(resources.program);
      const uniforms = resources.uniforms;
      gl.uniform2f(uniforms.u_size, width, height);
      gl.uniform2f(uniforms.u_offset, view.offsetX, view.offsetY);
      gl.uniform1f(uniforms.u_scale, view.scale);
      gl.uniform1f(uniforms.u_time, input.reducedMotion ? 0 : state.time % 100000);
      gl.uniform1f(uniforms.u_nightMix, state.night);
      gl.uniform1f(uniforms.u_motion, input.reducedMotion ? 0 : 1);
      const rippleCount = Math.min(state.ripples.length, resources.rippleLimit);
      const currentCount = Math.min(state.currents.length, resources.currentLimit);
      for (let i = 0; i < rippleCount; i++) {
        const ripple = state.ripples[state.ripples.length - rippleCount + i];
        const fade = clamp(1 - number(ripple.age) / Math.max(0.001, number(ripple.maxAge, 3)), 0, 1);
        const index = i * 4;
        resources.rippleData[index] = number(ripple.x);
        resources.rippleData[index + 1] = number(ripple.y);
        resources.rippleData[index + 2] = Math.max(0, number(ripple.radius));
        resources.rippleData[index + 3] = clamp(number(ripple.strength, 1), 0, 3) * fade * (input.reducedMotion ? 0.35 : 1);
      }
      for (let i = 0; i < currentCount; i++) {
        const current = state.currents[state.currents.length - currentCount + i];
        const age = Math.max(0, number(current.age));
        const fade = clamp(1 - age / Math.max(0.001, number(current.maxAge, 4)), 0, 1);
        const index = i * 4;
        resources.currentData[index] = number(current.x);
        resources.currentData[index + 1] = number(current.y);
        resources.currentData[index + 2] = Math.max(1, number(current.radius, 160));
        resources.currentData[index + 3] = clamp(number(current.strength, 1), 0, 3) * fade * (1 - Math.exp(-age * 8)) * (input.reducedMotion ? 0.3 : 1);
        resources.directionData[i * 2] = number(current.dx);
        resources.directionData[i * 2 + 1] = number(current.dy);
      }
      gl.uniform1f(uniforms.u_rippleCount, rippleCount);
      gl.uniform1f(uniforms.u_currentCount, currentCount);
      gl.uniform4fv(uniforms['u_ripples[0]'], resources.rippleData);
      gl.uniform4fv(uniforms['u_currents[0]'], resources.currentData);
      gl.uniform2fv(uniforms['u_directions[0]'], resources.directionData);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } catch (error) {
      enableFallback(error);
      renderFallback(state);
    }
  }

  function onContextLost(event) {
    event.preventDefault();
    if (disposed) return;
    lost = true;
    resources = null;
    enableFallback('The graphics context was interrupted');
    if (latestState) renderFallback(latestState);
  }

  function onContextRestored() {
    if (disposed) return;
    lost = false;
    try {
      initializeWebGL();
      if (latestState) render(latestState);
    } catch (error) { enableFallback(error); }
  }

  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);
  try { initializeWebGL(); } catch (error) { enableFallback(error); }

  return {
    get kind() { return kind; },
    render,
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      releaseResources();
      if (fallbackCanvas && fallbackCanvas !== canvas) fallbackCanvas.remove();
      if (canvas.style) canvas.style.visibility = originalVisibility;
      fallbackCanvas = null;
      fallbackContext = null;
      latestState = null;
    },
  };
}
