// public/js/lightRays.js
// LightRays на чистом WebGL (без OGL и CDN). ESM, совместимо с твоим initLightRays().

const DEFAULTS = {
    raysOrigin: 'top-center',
    raysColor: '#ffffff',
    raysSpeed: 1,
    lightSpread: 1,
    rayLength: 2,
    pulsating: false,
    fadeDistance: 1.0,
    saturation: 1.0,
    followMouse: true,
    mouseInfluence: 0.1,
    noiseAmount: 0.0,
    distortion: 0.0,
    className: ''
};

const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255] : [1,1,1];
};

const getAnchorAndDir = (origin, w, h) => {
    const outside = 0.2;
    switch (origin) {
        case 'top-left':      return { anchor:[0,-outside*h],           dir:[0,1] };
        case 'top-right':     return { anchor:[w,-outside*h],           dir:[0,1] };
        case 'left':          return { anchor:[-outside*w,0.5*h],       dir:[1,0] };
        case 'right':         return { anchor:[(1+outside)*w,0.5*h],    dir:[-1,0] };
        case 'bottom-left':   return { anchor:[0,(1+outside)*h],        dir:[0,-1] };
        case 'bottom-center': return { anchor:[0.5*w,(1+outside)*h],    dir:[0,-1] };
        case 'bottom-right':  return { anchor:[w,(1+outside)*h],        dir:[0,-1] };
        default:              return { anchor:[0.5*w,-outside*h],       dir:[0,1] };
    }
};

// ===== мини-утилиты WebGL =====
function createGL(canvas) {
    return (
        canvas.getContext('webgl', { alpha: true, antialias: false }) ||
        canvas.getContext('experimental-webgl', { alpha: true, antialias: false })
    );
}
function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('Shader compile error: ' + info);
    }
    return sh;
}
function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(prog);
        gl.deleteProgram(prog);
        throw new Error('Program link error: ' + info);
    }
    return prog;
}
function setUniform(gl, loc, val) {
    if (typeof val === 'number') { gl.uniform1f(loc, val); return; }
    if (Array.isArray(val)) {
        if (val.length === 2) gl.uniform2f(loc, val[0], val[1]);
        else if (val.length === 3) gl.uniform3f(loc, val[0], val[1], val[2]);
        else if (val.length === 4) gl.uniform4f(loc, val[0], val[1], val[2], val[3]);
    }
}

// ===== шейдеры (как раньше) =====
const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `precision highp float;
uniform float iTime;
uniform vec2  iResolution;
uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;
varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}
float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);
  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;
  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );
  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }
  vec4 rays1 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);
  fragColor = rays1 * 0.5 + rays2 * 0.4;
  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }
  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;
  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }
  fragColor.rgb *= raysColor;
}
void main(){
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`;

// ===== инстансы по элементам =====
const INSTANCES = new Map();

export async function mountLightRays(el, opts = {}) {
    if (!el || INSTANCES.has(el)) return;
    const options = { ...DEFAULTS, ...opts };

    // canvas + gl
    const canvas = document.createElement('canvas');
    canvas.className = `light-rays-canvas ${options.className || ''}`.trim();
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(canvas);

    const gl = createGL(canvas);
    if (!gl) { console.warn('WebGL not supported'); return; }

    // программа и фуллскрин-треугольник
    const program = createProgram(gl, VERT, FRAG);
    gl.useProgram(program);

    const posLoc = gl.getAttribLocation(program, 'position');
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    // большой треугольник (−1,−1) (3,−1) (−1,3)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // юниформы
    const U = {
        iTime: gl.getUniformLocation(program, 'iTime'),
        iResolution: gl.getUniformLocation(program, 'iResolution'),
        rayPos: gl.getUniformLocation(program, 'rayPos'),
        rayDir: gl.getUniformLocation(program, 'rayDir'),
        raysColor: gl.getUniformLocation(program, 'raysColor'),
        raysSpeed: gl.getUniformLocation(program, 'raysSpeed'),
        lightSpread: gl.getUniformLocation(program, 'lightSpread'),
        rayLength: gl.getUniformLocation(program, 'rayLength'),
        pulsating: gl.getUniformLocation(program, 'pulsating'),
        fadeDistance: gl.getUniformLocation(program, 'fadeDistance'),
        saturation: gl.getUniformLocation(program, 'saturation'),
        mousePos: gl.getUniformLocation(program, 'mousePos'),
        mouseInfluence: gl.getUniformLocation(program, 'mouseInfluence'),
        noiseAmount: gl.getUniformLocation(program, 'noiseAmount'),
        distortion: gl.getUniformLocation(program, 'distortion'),
    };

    const state = {
        gl, canvas, program, U, options,
        mouse:{x:0.5,y:0.5}, smoothMouse:{x:0.5,y:0.5},
        raf:0, isRunning:false, onResize:null, onMouseMove:null, io:null
    };
    INSTANCES.set(el, state);

    // начальные значения
    gl.uniform3f(U.raysColor, ...hexToRgb(options.raysColor));
    gl.uniform1f(U.raysSpeed, options.raysSpeed);
    gl.uniform1f(U.lightSpread, options.lightSpread);
    gl.uniform1f(U.rayLength, options.rayLength);
    gl.uniform1f(U.pulsating, options.pulsating ? 1.0 : 0.0);
    gl.uniform1f(U.fadeDistance, options.fadeDistance);
    gl.uniform1f(U.saturation, options.saturation);
    gl.uniform1f(U.mouseInfluence, options.mouseInfluence);
    gl.uniform1f(U.noiseAmount, options.noiseAmount);
    gl.uniform1f(U.distortion, options.distortion);

    const updatePlacement = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const wCSS = el.clientWidth || 1;
        const hCSS = el.clientHeight || 1;
        canvas.width = Math.max(1, Math.floor(wCSS * dpr));
        canvas.height = Math.max(1, Math.floor(hCSS * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        setUniform(gl, U.iResolution, [canvas.width, canvas.height]);
        const { anchor, dir } = getAnchorAndDir(options.raysOrigin, canvas.width, canvas.height);
        setUniform(gl, U.rayPos, anchor);
        setUniform(gl, U.rayDir, dir);
    };

    const loop = (t) => {
        setUniform(gl, U.iTime, t * 0.001);
        if (options.followMouse && options.mouseInfluence > 0) {
            const s = 0.92;
            state.smoothMouse.x = state.smoothMouse.x * s + state.mouse.x * (1 - s);
            state.smoothMouse.y = state.smoothMouse.y * s + state.mouse.y * (1 - s);
            setUniform(gl, U.mousePos, [state.smoothMouse.x, state.smoothMouse.y]);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        state.raf = requestAnimationFrame(loop);
    };

    state.onResize = updatePlacement;
    window.addEventListener('resize', state.onResize);
    updatePlacement();

    state.onMouseMove = (e) => {
        const r = el.getBoundingClientRect();
        state.mouse.x = (e.clientX - r.left) / r.width;
        state.mouse.y = (e.clientY - r.top) / r.height;
    };
    if (options.followMouse) window.addEventListener('mousemove', state.onMouseMove);

    // ленивый старт через IO
    state.io = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !state.isRunning) {
            state.isRunning = true; state.raf = requestAnimationFrame(loop);
        } else if (!entry.isIntersecting && state.isRunning) {
            state.isRunning = false; cancelAnimationFrame(state.raf);
        }
    }, { threshold: 0.1 });
    state.io.observe(el);
}

export function unmountLightRays(el) {
    const s = INSTANCES.get(el); if (!s) return;
    s.io?.disconnect?.();
    window.removeEventListener('resize', s.onResize);
    if (s.options.followMouse) window.removeEventListener('mousemove', s.onMouseMove);
    cancelAnimationFrame(s.raf);
    const c = s.canvas; if (c && c.parentNode) c.parentNode.removeChild(c);
    INSTANCES.delete(el);
}

export function initLightRays() {
    document.querySelectorAll('[data-light-rays]').forEach(async (el) => {
        if (INSTANCES.has(el)) return;
        let opts = {};
        const json = el.getAttribute('data-light-rays');
        if (json && json.trim() && json.trim() !== 'true') { try { opts = JSON.parse(json); } catch {} }
        const norm = (k) => 'data-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        for (const k of Object.keys(DEFAULTS)) {
            const a = el.getAttribute(norm(k));
            if (a != null) {
                if (a === 'true' || a === 'false') opts[k] = (a === 'true');
                else if (!Number.isNaN(parseFloat(a)) && isFinite(a)) opts[k] = parseFloat(a);
                else opts[k] = a;
            }
        }
        await mountLightRays(el, opts);
    });
}
