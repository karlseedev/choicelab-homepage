// 첫 화면 배경의 비단 리본 (WebGL2). 색 그림은 ribbon-palette.js에 있다.
// 그릴 수 없는 환경에서는 .hero-ribbon에 is-fallback을 붙여 정지 이미지를 보여 준다.
(function () {
  "use strict";

  var wrap = document.querySelector(".hero-ribbon");
  var canvas = document.getElementById("hero-ribbon");
  if (!wrap || !canvas) return;
  function fallback() { wrap.classList.add("is-fallback"); }

  var gl = window.RIBBON_PALETTE && canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) { fallback(); return; }

  // ---- 모양 ----
  // 길이는 기준 화면(높이 975)에서의 화소 단위다. 화면 높이에 맞춰 통째로 늘고 준다.
  var SHAPE = {
    refHeight: 975,
    speed: 4e-5, timeOffset: 17500,
    pos: [330, -80, -11], rot: [-0.4496, -0.1176, 1.8744], scale: [9, 8, 5],
    wave: [0.005831, 0.016001, -7.821],   // 굴곡의 주파수 둘, 굴곡 양
    roll: [3.14, 0.5, 8, 1.2],            // 길이 축을 따라 도는 꼬임: 각도, 자리, 급한 정도, 시작 각도
    curl: [0.41, 0.7],                    // 폭 방향으로 말리는 정도: 각도, 범위의 날카로움
    gap: [1, 15, 0.5, 0.15],              // 두 겹 사이: 간격 배수, 꼬임 자리에서 더 벌리는 양, 그 자리, 그 폭
    glow: [1.98, 0.806, 0.834],           // 접힘 광택: 양, 지수, 경사
    streak: [0.30, 0.42, 0.45, 600],      // 결: 세기, 어두운 선의 기준, 가는 결의 비율, 촘촘함
    blur: 0.02, grain: 1.1
  };
  // 화면 비율별 구도: 확대 배수, 화면 한가운데에 둘 지점(기준 화면 좌표, 가운데가 0), 그림 전체를 돌리는 각도
  var VIEWS = {
    wide: { zoom: 0.78, center: [-480, 30], turn: 0 },
    tall: { zoom: 0.5, center: [-180, 691], turn: 1.27 }    // 세로 화면에서는 리본을 눕혀 글자 아래로 지나가게 한다
  };
  var REF_ZOOM = 0.85;   // 광택 값을 맞춘 확대 배수
  // 시험용: 주소에 ?fade=1 을 붙이면 리본의 흰 가장자리를 투명하게 바꿔 검은 바탕에 부드럽게 녹인다
  var EDGE_FADE = new URLSearchParams(location.search).get("fade") === "1" ? 1 : 0;

  var VS = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 a_pos;",
    "in vec2 a_uv;",
    "uniform mat4 u_mvp;",
    "uniform float u_time;",
    "uniform vec3 u_wave;",
    "uniform vec4 u_roll;",
    "uniform vec2 u_curl;",
    "out vec2 v_uv;",
    "vec2 grad(vec2 p){",
    "  uvec2 q = uvec2(ivec2(p));",
    "  uint h = q.x*1597334677u ^ q.y*3812015801u;",
    "  h ^= h >> 16; h *= 2246822519u; h ^= h >> 13; h *= 3266489917u; h ^= h >> 16;",
    "  float a = float(h)*(6.28318530718/4294967296.0);",
    "  return vec2(cos(a), sin(a));",
    "}",
    "float snoise(vec2 p){",
    "  const float K1 = 0.366025404, K2 = 0.211324865;",
    "  vec2 i = floor(p + (p.x + p.y)*K1);",
    "  vec2 a = p - i + (i.x + i.y)*K2;",
    "  float m = step(a.y, a.x);",
    "  vec2 o = vec2(m, 1.0 - m);",
    "  vec2 b = a - o + K2;",
    "  vec2 c = a - 1.0 + 2.0*K2;",
    "  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);",
    "  vec3 n = h*h*h*vec3(dot(a, grad(i)), dot(b, grad(i + o)), dot(c, grad(i + 1.0)));",
    "  return dot(n, vec3(32.99));",
    "}",
    "vec3 rotate(vec3 v, vec3 axis, float ang){",
    "  vec3 k = normalize(axis);",
    "  float c = cos(ang), s = sin(ang);",
    "  return v*c + cross(k, v)*s + k*dot(k, v)*(1.0 - c);",
    "}",
    "void main(){",
    "  v_uv = a_uv;",
    "  vec3 p = a_pos;",
    "  // 아주 느린 잡음으로 면을 살짝 올렸다 내린다",
    "  p.y += u_wave.z * snoise(vec2(p.x*u_wave.x + u_time, p.z*u_wave.y + u_time));",
    "  // 길이 축을 따라 도는 꼬임: 가운데를 지나면서 면이 한 번 뒤집힌다",
    "  float t = 1.0/(1.0 + exp(-(a_uv.y - u_roll.y)*u_roll.z));",
    "  p = rotate(p, vec3(1.0, 0.0, 0.0), u_roll.w + u_roll.x*t);",
    "  // 폭 방향으로 살짝 말린다",
    "  p = rotate(p, vec3(0.5, 0.0, 0.5), u_curl.x * exp2(-exp2(u_curl.y)*pow(a_uv.x, u_curl.y)));",
    "  gl_Position = u_mvp * vec4(p, 1.0);",
    "}"
  ].join("\n");

  var FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 v_uv;",
    "uniform sampler2D u_palette;",
    "uniform float u_foldScale;",
    "uniform vec2 u_foldDir;",
    "uniform vec3 u_glow;",
    "uniform vec4 u_streak;",
    "uniform float u_edgeFade;",
    "out vec4 o;",
    "vec2 grad(vec2 p){",
    "  uvec2 q = uvec2(ivec2(p));",
    "  uint h = q.x*1597334677u ^ q.y*3812015801u;",
    "  h ^= h >> 16; h *= 2246822519u; h ^= h >> 13; h *= 3266489917u; h ^= h >> 16;",
    "  float a = float(h)*(6.28318530718/4294967296.0);",
    "  return vec2(cos(a), sin(a));",
    "}",
    "float snoise(vec2 p){",
    "  const float K1 = 0.366025404, K2 = 0.211324865;",
    "  vec2 i = floor(p + (p.x + p.y)*K1);",
    "  vec2 a = p - i + (i.x + i.y)*K2;",
    "  float m = step(a.y, a.x);",
    "  vec2 oo = vec2(m, 1.0 - m);",
    "  vec2 b = a - oo + K2;",
    "  vec2 c = a - 1.0 + 2.0*K2;",
    "  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);",
    "  vec3 n = h*h*h*vec3(dot(a, grad(i)), dot(b, grad(i + oo)), dot(c, grad(i + 1.0)));",
    "  return dot(n, vec3(32.99));",
    "}",
    "void main(){",
    "  // 접힘 정도: 길이 방향 좌표가 화면에서 얼마나 빨리 변하는가",
    "  float fold = dot(vec2(dFdx(v_uv.y), dFdy(v_uv.y)), u_foldDir) * u_foldScale * u_glow.x;",
    "  fold = clamp(fold*0.5 + 0.5, 0.0, 1.0);",
    "  fold = pow(fold, u_glow.y);",
    "  fold = clamp(smoothstep(0.0, u_glow.z, fold), 0.0, 1.0);",
    "",
    "  vec3 col = texture(u_palette, v_uv).rgb;",
    "",
    "  // 결: 길이 방향으로 흐르는 촘촘한 줄무늬 잡음. 밝은 선과 어두운 선이 같이 있고 더 가는 결을 한 겹 얹는다.",
    "  float freq = u_streak.w;",
    "  float edge = 1.0 - pow(4.0*v_uv.x*(1.0 - v_uv.x), 3.0);",
    "  float n0 = snoise(vec2(v_uv.x*0.1, v_uv.y*0.5));",
    "  float n1 = snoise(vec2(v_uv.x*(freq + freq*0.5*n0), v_uv.y*4.0*n0))*0.5 + 0.5;",
    "  float n2 = snoise(vec2(v_uv.x*freq*1.9 + 31.7, v_uv.y*3.0 + n0))*0.5 + 0.5;",
    "  float fwx = fwidth(v_uv.x);",
    "  float aa1 = clamp(1.3 - fwx*freq*1.6, 0.0, 1.0);          // 선이 화소보다 가늘어지는 곳에서는 뺀다",
    "  float aa2 = clamp(1.3 - fwx*freq*3.0, 0.0, 1.0);",
    "  float chroma = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));",
    "  float ink = smoothstep(0.06, 0.30, chroma);                // 흰 가장자리에는 결을 넣지 않는다",
    "  col += ((n1 - u_streak.y)*u_streak.x*aa1 + (n2 - 0.5)*u_streak.x*u_streak.z*aa2)*ink*fold*edge;",
    "",
    "  col += (1.0 - fold)*0.25;       // 눕거나 접히는 면이 밝아진다",
    "  // 어두운 바탕에서는 색 그림의 흰 가장자리를 투명하게 바꾼다. 합성에서 값이 제곱되므로 제곱근을 넣는다.",
    "  float a = sqrt(mix(1.0, smoothstep(0.0, 0.14, chroma), u_edgeFade));",
    "  o = vec4(clamp(col, 0.0, 1.0)*a, a);",
    "}"
  ].join("\n");

  // 후처리: 위아래 가장자리를 살짝 돌려 번지게 하고 입자를 얹는다
  var PVS = [
    "#version 300 es",
    "in vec2 a; out vec2 v_uv;",
    "void main(){ v_uv = a*0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }"
  ].join("\n");
  var PFS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 v_uv; uniform sampler2D u_scene; uniform float u_grain; uniform float u_blur; out vec4 o;",
    "float rnd(vec2 s){ return fract(sin(dot(s, vec2(12.9898, 78.233)))*43758.5453); }",
    "vec4 spin(vec2 uv, float angle){",
    "  const int N = 6;",
    "  vec4 total = vec4(0.0); vec2 p = uv - 0.5;",
    "  float cs = cos(angle/float(N)), sn = sin(angle/float(N));",
    "  mat2 r = mat2(cs, sn, -sn, cs);",
    "  for (int i = 0; i < N; i++){ total += texture(u_scene, p + 0.5); p = r*p; }",
    "  return total/float(N);",
    "}",
    "void main(){",
    "  vec4 sharp = texture(u_scene, v_uv);",
    "  float keep = smoothstep(0.0, 0.7, v_uv.y) - smoothstep(0.2, 1.0, v_uv.y);",
    "  vec4 c = mix(spin(v_uv, u_blur), sharp, keep);",
    "  float g = rnd(gl_FragCoord.xy*0.01);",
    "  c.rgb += mix(u_grain*4.0/255.0, -u_grain*4.0/255.0, g)*c.a;",
    "  o = vec4(min(c.rgb, 1.0), c.a);",
    "}"
  ].join("\n");

  // ---- 행렬 (열 우선) ----
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      var s = 0;
      for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }
  function ident() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function trans(v) { var m = ident(); m[12] = v[0]; m[13] = v[1]; m[14] = v[2]; return m; }
  function scal(v) { var m = ident(); m[0] = v[0]; m[5] = v[1]; m[10] = v[2]; return m; }
  function rx(a) { var c = Math.cos(a), s = Math.sin(a), m = ident(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
  function ry(a) { var c = Math.cos(a), s = Math.sin(a), m = ident(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
  function rz(a) { var c = Math.cos(a), s = Math.sin(a), m = ident(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
  function ortho(l, r, b, t, n, f) {
    return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]);
  }
  // 멀리 정면에서 살짝 비껴 보는 시점
  var VIEW_MATRIX = (function () {
    var eye = [100, 0, 5000], l = Math.hypot(eye[0], eye[1], eye[2]);
    var z = [eye[0] / l, eye[1] / l, eye[2] / l];
    var xl = Math.hypot(z[2], z[0]), x = [z[2] / xl, 0, -z[0] / xl];
    var y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    function d(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -d(x, eye), -d(y, eye), -d(z, eye), 1]);
  })();
  var MODEL = mul(trans(SHAPE.pos), mul(mul(mul(rx(SHAPE.rot[0]), ry(SHAPE.rot[1])), rz(SHAPE.rot[2])), scal(SHAPE.scale)));

  // ---- 한쪽 가장자리에서 반으로 접힌 긴 판 ----
  function folded(W, H, NX, NY, G) {
    var cols = NX + 1, rows = NY + 1;
    var pos = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2), k = 0, m = 0, r, c;
    for (r = 0; r < rows; r++) {
      var y = H / 2 - r * (H / NY), fv = 1 - r / NY;
      var gb = (fv - G[2]) / G[3];
      var gap = G[0] * (4 - 2 * Math.pow(4 * fv * (1 - fv), 9.5)) + G[1] * Math.exp(-gb * gb);   // 두 겹 사이 간격의 절반
      for (c = 0; c < cols; c++) {
        var x = c * (W / NX) - W / 2, z;
        if (x < -16) z = gap;
        else if (x < 16) { var a = (x + 16) * Math.PI / 32; z = Math.cos(a) * gap; x = Math.cos(a - Math.PI / 2) * gap - 16; }
        else { z = -gap; x = -x; }
        x += W / 4;
        pos[k++] = y; pos[k++] = z; pos[k++] = x;           // 길이는 X축, 두께는 Y축, 폭은 Z축
        uv[m++] = c / NX; uv[m++] = fv;
      }
    }
    var idx = new Uint32Array(NX * NY * 6), n = 0;
    for (r = 0; r < NY; r++) for (c = 0; c < NX; c++) {
      var p0 = c + cols * r, p1 = c + cols * (r + 1);
      idx[n++] = p0; idx[n++] = p1; idx[n++] = p0 + 1; idx[n++] = p1; idx[n++] = p1 + 1; idx[n++] = p0 + 1;
    }
    return { pos: pos, uv: uv, idx: idx };
  }

  // ---- 준비 ----
  var broken = false;
  function program(vsSrc, fsSrc) {
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) broken = true;
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vsSrc)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) broken = true;
    return p;
  }
  var P = program(VS, FS), PP = program(PVS, PFS);
  if (broken) { fallback(); return; }
  function U(p, name) { return gl.getUniformLocation(p, name); }
  function attr(p, name, data, size) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    var l = gl.getAttribLocation(p, name);
    gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
  }

  var mesh = folded(400, 400, 128, 256, SHAPE.gap);
  var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  attr(P, "a_pos", mesh.pos, 3); attr(P, "a_uv", mesh.uv, 2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
  var quad = gl.createVertexArray(); gl.bindVertexArray(quad);
  attr(PP, "a", new Float32Array([-1, -1, 3, -1, -1, 3]), 2);

  function texParams() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  var palTex = gl.createTexture(), sceneTex = gl.createTexture(), fbo = gl.createFramebuffer(), depth = gl.createRenderbuffer();
  var tw = 0, th = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w === tw && h === th) return;
    tw = w; th = h; canvas.width = w; canvas.height = h;
    gl.bindTexture(gl.TEXTURE_2D, sceneTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); texParams();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  }

  function draw(elapsedMs) {
    resize();
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    var view = cw >= ch ? VIEWS.wide : VIEWS.tall;
    var k = view.zoom * ch / SHAPE.refHeight;               // 기준 화면의 1이 화면에서 몇 화소인가
    var hw = cw / 2 / k, hh = ch / 2 / k, cx = view.center[0], cy = view.center[1];
    var mvp = mul(ortho(cx - hw, cx + hw, cy - hh, cy + hh, 1, 10000), mul(rz(view.turn), mul(VIEW_MATRIX, MODEL)));

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, tw, th);
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.SRC_COLOR, gl.ZERO);   // 색을 제곱해서 깊게
    gl.useProgram(P); gl.bindVertexArray(vao);
    gl.uniformMatrix4fv(U(P, "u_mvp"), false, mvp);
    gl.uniform1f(U(P, "u_time"), (elapsedMs + SHAPE.timeOffset) * SHAPE.speed);
    gl.uniform3fv(U(P, "u_wave"), SHAPE.wave); gl.uniform4fv(U(P, "u_roll"), SHAPE.roll); gl.uniform2fv(U(P, "u_curl"), SHAPE.curl);
    gl.uniform1f(U(P, "u_foldScale"), SHAPE.refHeight * (k / REF_ZOOM) * dpr);
    gl.uniform2f(U(P, "u_foldDir"), -Math.sin(view.turn), Math.cos(view.turn));   // 그림을 돌려도 광택은 그림을 따라 돈다
    gl.uniform1f(U(P, "u_edgeFade"), EDGE_FADE);
    gl.uniform3fv(U(P, "u_glow"), SHAPE.glow); gl.uniform4fv(U(P, "u_streak"), SHAPE.streak);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, palTex); gl.uniform1i(U(P, "u_palette"), 0);
    gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_INT, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, tw, th);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(PP); gl.bindVertexArray(quad);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex); gl.uniform1i(U(PP, "u_scene"), 0);
    gl.uniform1f(U(PP, "u_grain"), SHAPE.grain); gl.uniform1f(U(PP, "u_blur"), SHAPE.blur);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---- 돌리기 ----
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fixed = new URLSearchParams(location.search).get("ribbon-t");   // 확인용: 주소에 ?ribbon-t=0 을 붙이면 그 시각에서 멈춘다
  if (fixed !== null) still = true;
  var visible = true, lost = false, raf = 0, clock = 0, last = 0;

  function frame(now) {
    raf = 0;
    if (lost) return;
    clock += Math.min(now - last, 100); last = now;
    draw(clock);
    if (visible && !still) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (raf || lost) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; fallback(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;   // 화면 밖에서는 멈춘다
      if (visible) wake();
    }).observe(canvas);
  }
  window.addEventListener("resize", wake);

  var img = new Image();
  img.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, palTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    texParams();
    if (fixed !== null) clock = parseFloat(fixed) || 0;
    wake();
    wrap.classList.add("is-live");
  };
  img.onerror = fallback;
  img.src = window.RIBBON_PALETTE;
})();
