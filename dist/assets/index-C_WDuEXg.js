var W=Object.defineProperty;var Y=(d,t,e)=>t in d?W(d,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):d[t]=e;var o=(d,t,e)=>Y(d,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function e(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(s){if(s.ep)return;s.ep=!0;const a=e(s);fetch(s.href,a)}})();const Z=["angle1","velocity1","angle2","velocity2"],j=["angle1","velocity1","stretch1","stretchRate1","angle2","velocity2","stretch2","stretchRate2"],Q={system:"rigid",vizMode:"distance",resolution:512,phaseSpace:{x:{dimension:"angle1",min:-Math.PI,max:Math.PI},y:{dimension:"angle2",min:-Math.PI,max:Math.PI},initialValues:{angle1:0,velocity1:0,angle2:0,velocity2:0,stretch1:0,stretchRate1:0,stretch2:0,stretchRate2:0}},dt:.002,iterationsPerFrame:10,maxIter:5e3,perturb:1e-5,m1:1,m2:1,L1:1,L2:1,k1:50,k2:50,colormap:6,toneMapping:0,seed:Math.random()*1e3},J={rigid:"Rigid",elastic12:"Elastic Double Pendulum",nonlinear:"Nonlinear Elastic Pendulum"},tt={distance:"Bob2 Distance",divergence:"Divergence Time"};class et{constructor(t){o(this,"buffer");this.gl=t;const e=t.createBuffer();if(!e)throw new Error("Failed to create buffer");this.buffer=e;const i=new Float32Array([-1,-1,1,-1,-1,1,1,1]);t.bindBuffer(t.ARRAY_BUFFER,this.buffer),t.bufferData(t.ARRAY_BUFFER,i,t.STATIC_DRAW)}bind(){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer)}draw(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}}class ${constructor(t){this.gl=t}createFloatTexture(t){const e=this.gl.createTexture();if(!e)throw new Error("Failed to create texture");return this.gl.bindTexture(this.gl.TEXTURE_2D,e),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA32F,t,t,0,this.gl.RGBA,this.gl.FLOAT,null),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.NEAREST),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.NEAREST),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),e}createTexturePair(t){return[this.createFloatTexture(t),this.createFloatTexture(t)]}bindTexture(t,e){this.gl.activeTexture(this.gl.TEXTURE0+t),this.gl.bindTexture(this.gl.TEXTURE_2D,e)}}class q{constructor(t){this.gl=t}getLocation(t,e){return this.gl.getUniformLocation(t,e)}setIfFound(t,e,i){const s=this.getLocation(t,e);s!==null&&i(s)}set1f(t,e,i){this.setIfFound(t,e,s=>this.gl.uniform1f(s,i))}set1i(t,e,i){this.setIfFound(t,e,s=>this.gl.uniform1i(s,i))}set2f(t,e,i,s){this.setIfFound(t,e,a=>this.gl.uniform2f(a,i,s))}set4f(t,e,i,s,a,r){this.setIfFound(t,e,n=>this.gl.uniform4f(n,i,s,a,r))}set1b(t,e,i){this.setIfFound(t,e,s=>this.gl.uniform1i(s,i?1:0))}}class it{constructor(t){this.gl=t}create(){const t=this.gl.createFramebuffer();if(!t)throw new Error("Failed to create framebuffer");return t}attachColor(t,e){this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,t,this.gl.TEXTURE_2D,e,0)}checkStatus(){const t=this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);if(t!==this.gl.FRAMEBUFFER_COMPLETE)throw new Error(`Framebuffer incomplete: ${t}`)}bind(t){this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,t)}}class V{constructor(t){this.gl=t}compile(t,e){const i=this.gl.createShader(t);if(!i)throw new Error("Failed to create shader");if(this.gl.shaderSource(i,e.trim()),this.gl.compileShader(i),!this.gl.getShaderParameter(i,this.gl.COMPILE_STATUS)){const s=this.gl.getShaderInfoLog(i);throw this.gl.deleteShader(i),new Error(`Shader compile error: ${s}`)}return i}linkProgram(t,e,i){const s=this.compile(this.gl.VERTEX_SHADER,t),a=this.compile(this.gl.FRAGMENT_SHADER,e),r=this.gl.createProgram();if(!r)throw new Error("Failed to create program");if(this.gl.attachShader(r,s),this.gl.attachShader(r,a),this.gl.linkProgram(r),this.gl.deleteShader(s),this.gl.deleteShader(a),!this.gl.getProgramParameter(r,this.gl.LINK_STATUS)){const n=this.gl.getProgramInfoLog(r);throw this.gl.deleteProgram(r),new Error(`Program link error (${i}): ${n}`)}return{program:r,name:i}}}const O=`// Rigid double pendulum ODE right-hand side
// Requires uniforms: float u_m1, float u_m2, float u_L1, float u_L2
// Defines: computeAccelerations(theta1, omega1, theta2, omega2) -> vec2

const float g = 9.81;

vec2 computeAccelerations(float theta1, float omega1, float theta2, float omega2) {
    float m1 = u_m1;
    float m2 = u_m2;
    float L1 = u_L1;
    float L2 = u_L2;
    float delta = theta1 - theta2;
    float sinDelta = sin(delta);
    float cosDelta = cos(delta);
    float denom = m1 + m2 * sinDelta * sinDelta;

    float num1 = -m2 * L1 * omega1 * omega1 * sinDelta * cosDelta
               - m2 * L2 * omega2 * omega2 * sinDelta
               - (m1 + m2) * g * sin(theta1)
               + m2 * g * sin(theta2) * cosDelta;

    float num2 = (m1 + m2) * L1 * omega1 * omega1 * sinDelta
               + m2 * L2 * omega2 * omega2 * sinDelta * cosDelta
               + (m1 + m2) * g * sin(theta1) * cosDelta
               - (m1 + m2) * g * sin(theta2);

    return vec2(num1 / (L1 * denom), num2 / (L2 * denom));
}
`,k=`// Elastic double pendulum ODE right-hand side
// Requires uniforms: float u_k1, float u_k2, float u_m1, float u_m2, float u_L1, float u_L2
// Defines: systemDeriv(sa, sb, out da, out db)

const float G  = 9.81;

vec3 solveCramer3(mat3 M, vec3 f) {
    float det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
              - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
              + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    float invDet = 1.0 / det;
    float x0 = f.x   * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
              - M[0][1] * (f.y   * M[2][2] - M[1][2] * f.z)
              + M[0][2] * (f.y   * M[2][1] - M[1][1] * f.z);
    float x1 = M[0][0] * (f.y   * M[2][2] - M[1][2] * f.z)
              - f.x     * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
              + M[0][2] * (M[1][0] * f.z   - f.y     * M[2][0]);
    float x2 = M[0][0] * (M[1][1] * f.z   - f.y     * M[2][1])
              - M[0][1] * (M[1][0] * f.z   - f.y     * M[2][0])
              + f.x     * (M[1][1] * M[2][0] - M[1][0] * M[2][1]);
    return vec3(x0, x1, x2) * invDet;
}

float det4(mat4 M) {
    float d00 = M[1][1]*(M[2][2]*M[3][3] - M[2][3]*M[3][2])
              - M[1][2]*(M[2][1]*M[3][3] - M[2][3]*M[3][1])
              + M[1][3]*(M[2][1]*M[3][2] - M[2][2]*M[3][1]);
    float d01 = M[1][0]*(M[2][2]*M[3][3] - M[2][3]*M[3][2])
              - M[1][2]*(M[2][0]*M[3][3] - M[2][3]*M[3][0])
              + M[1][3]*(M[2][0]*M[3][2] - M[2][2]*M[3][0]);
    float d02 = M[1][0]*(M[2][1]*M[3][3] - M[2][3]*M[3][1])
              - M[1][1]*(M[2][0]*M[3][3] - M[2][3]*M[3][0])
              + M[1][3]*(M[2][0]*M[3][1] - M[2][1]*M[3][0]);
    float d03 = M[1][0]*(M[2][1]*M[3][2] - M[2][2]*M[3][1])
              - M[1][1]*(M[2][0]*M[3][2] - M[2][2]*M[3][0])
              + M[1][2]*(M[2][0]*M[3][1] - M[2][1]*M[3][0]);
    return M[0][0]*d00 - M[0][1]*d01 + M[0][2]*d02 - M[0][3]*d03;
}

vec4 solveCramer4(mat4 M, vec4 f) {
    float det = det4(M);
    float invDet = 1.0 / det;
    mat4 M0 = M; M0[0][0] = f.x; M0[1][0] = f.y; M0[2][0] = f.z; M0[3][0] = f.w;
    mat4 M1 = M; M1[0][1] = f.x; M1[1][1] = f.y; M1[2][1] = f.z; M1[3][1] = f.w;
    mat4 M2m = M; M2m[0][2] = f.x; M2m[1][2] = f.y; M2m[2][2] = f.z; M2m[3][2] = f.w;
    mat4 M3 = M; M3[0][3] = f.x; M3[1][3] = f.y; M3[2][3] = f.z; M3[3][3] = f.w;
    return vec4(det4(M0), det4(M1), det4(M2m), det4(M3)) * invDet;
}

void systemDeriv(vec4 sa, vec4 sb, out vec4 da, out vec4 db) {
    float M1 = u_m1;
    float M2 = u_m2;
    float TOTAL_M = M1 + M2;
    float L10 = u_L1;
    float L20 = u_L2;
    float l1 = L10 + sa.z;
    float l2 = L20 + sb.z;
    float delta = sa.x - sb.x;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float l1sq = l1 * l1;
    float l2sq = l2 * l2;
    float w1sq = sa.y * sa.y;
    float w2sq = sb.y * sb.y;

    mat4 M;
    M[0][0] = TOTAL_M * l1sq; M[0][1] = 0.0;                M[0][2] = M2 * l1 * l2 * cosD; M[0][3] = -M2 * l1 * sinD;
    M[1][0] = 0.0;            M[1][1] = TOTAL_M;             M[1][2] = M2 * l2 * sinD;      M[1][3] = M2 * cosD;
    M[2][0] = M2*l1*l2*cosD;  M[2][1] = M2 * l2 * sinD;     M[2][2] = M2 * l2sq;            M[2][3] = 0.0;
    M[3][0] = -M2 * l1*sinD;  M[3][1] = M2 * cosD;          M[3][2] = 0.0;                  M[3][3] = M2;

    vec4 f;
    f.x = -2.0 * TOTAL_M * l1 * sa.w * sa.y
          - 2.0 * M2 * l1 * sb.w * sb.y * cosD
          - M2 * l1 * l2 * w2sq * sinD
          - TOTAL_M * G * l1 * sin(sa.x);
    f.y = TOTAL_M * l1 * w1sq
          + M2 * l2 * w2sq * cosD
          - 2.0 * M2 * sb.w * sb.y * sinD
          + TOTAL_M * G * cos(sa.x)
          - u_k1 * sa.z;
    f.z = -2.0 * M2 * l2 * sa.w * sa.y * cosD
          - 2.0 * M2 * l2 * sb.w * sb.y
          + M2 * l1 * l2 * w1sq * sinD
          - M2 * G * l2 * sin(sb.x);
    f.w = 2.0 * M2 * sa.w * sa.y * sinD
          + M2 * l1 * w1sq * cosD
          + M2 * l2 * w2sq
          + M2 * G * cos(sb.x)
          - u_k2 * sb.z;

    vec4 accel = solveCramer4(M, f);
    da = vec4(sa.y, accel.x, sa.w, accel.y);
    db = vec4(sb.y, accel.z, sb.w, accel.w);
}
`,H=`// Nonlinear elastic double pendulum ODE right-hand side
// Uses an exponential/stiffening spring model instead of linear Hooke's law
// Requires uniforms: float u_k1, float u_k2, float u_m1, float u_m2, float u_L1, float u_L2
// Defines: systemDeriv(sa, sb, out da, out db)

const float G  = 9.81;

vec3 solveCramer3(mat3 M, vec3 f) {
    float det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
              - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
              + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    float invDet = 1.0 / det;
    float x0 = f.x   * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
              - M[0][1] * (f.y   * M[2][2] - M[1][2] * f.z)
              + M[0][2] * (f.y   * M[2][1] - M[1][1] * f.z);
    float x1 = M[0][0] * (f.y   * M[2][2] - M[1][2] * f.z)
              - f.x     * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
              + M[0][2] * (M[1][0] * f.z   - f.y     * M[2][0]);
    float x2 = M[0][0] * (M[1][1] * f.z   - f.y     * M[2][1])
              - M[0][1] * (M[1][0] * f.z   - f.y     * M[2][0])
              + f.x     * (M[1][1] * M[2][0] - M[1][0] * M[2][1]);
    return vec3(x0, x1, x2) * invDet;
}

float det4(mat4 M) {
    float d00 = M[1][1]*(M[2][2]*M[3][3] - M[2][3]*M[3][2])
              - M[1][2]*(M[2][1]*M[3][3] - M[2][3]*M[3][1])
              + M[1][3]*(M[2][1]*M[3][2] - M[2][2]*M[3][1]);
    float d01 = M[1][0]*(M[2][2]*M[3][3] - M[2][3]*M[3][2])
              - M[1][2]*(M[2][0]*M[3][3] - M[2][3]*M[3][0])
              + M[1][3]*(M[2][0]*M[3][2] - M[2][2]*M[3][0]);
    float d02 = M[1][0]*(M[2][1]*M[3][3] - M[2][3]*M[3][1])
              - M[1][1]*(M[2][0]*M[3][3] - M[2][3]*M[3][0])
              + M[1][3]*(M[2][0]*M[3][1] - M[2][1]*M[3][0]);
    float d03 = M[1][0]*(M[2][1]*M[3][2] - M[2][2]*M[3][1])
              - M[1][1]*(M[2][0]*M[3][2] - M[2][2]*M[3][0])
              + M[1][2]*(M[2][0]*M[3][1] - M[2][1]*M[3][0]);
    return M[0][0]*d00 - M[0][1]*d01 + M[0][2]*d02 - M[0][3]*d03;
}

vec4 solveCramer4(mat4 M, vec4 f) {
    float det = det4(M);
    float invDet = 1.0 / det;
    mat4 M0 = M; M0[0][0] = f.x; M0[1][0] = f.y; M0[2][0] = f.z; M0[3][0] = f.w;
    mat4 M1 = M; M1[0][1] = f.x; M1[1][1] = f.y; M1[2][1] = f.z; M1[3][1] = f.w;
    mat4 M2m = M; M2m[0][2] = f.x; M2m[1][2] = f.y; M2m[2][2] = f.z; M2m[3][2] = f.w;
    mat4 M3 = M; M3[0][3] = f.x; M3[1][3] = f.y; M3[2][3] = f.z; M3[3][3] = f.w;
    return vec4(det4(M0), det4(M1), det4(M2m), det4(M3)) * invDet;
}

// Nonlinear spring force: exponential stiffening model
// F = -k * sign(x) * (exp(|x|/L0) - 1)
// This creates a spring that gets progressively stiffer as it stretches
float nonlinearSpringForce(float extension, float k, float L0) {
    float absExt = abs(extension);
    float forceMag = k * (exp(absExt / L0) - 1.0);
    return -sign(extension) * forceMag;
}

void systemDeriv(vec4 sa, vec4 sb, out vec4 da, out vec4 db) {
    float M1 = u_m1;
    float M2 = u_m2;
    float TOTAL_M = M1 + M2;
    float L10 = u_L1;
    float L20 = u_L2;
    float l1 = L10 + sa.z;
    float l2 = L20 + sb.z;
    float delta = sa.x - sb.x;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float l1sq = l1 * l1;
    float l2sq = l2 * l2;
    float w1sq = sa.y * sa.y;
    float w2sq = sb.y * sb.y;

    mat4 M;
    M[0][0] = TOTAL_M * l1sq; M[0][1] = 0.0;                M[0][2] = M2 * l1 * l2 * cosD; M[0][3] = -M2 * l1 * sinD;
    M[1][0] = 0.0;            M[1][1] = TOTAL_M;             M[1][2] = M2 * l2 * sinD;      M[1][3] = M2 * cosD;
    M[2][0] = M2*l1*l2*cosD;  M[2][1] = M2 * l2 * sinD;     M[2][2] = M2 * l2sq;            M[2][3] = 0.0;
    M[3][0] = -M2 * l1*sinD;  M[3][1] = M2 * cosD;          M[3][2] = 0.0;                  M[3][3] = M2;

    // Nonlinear spring forces
    float F_spring1 = nonlinearSpringForce(sa.z, u_k1, L10);
    float F_spring2 = nonlinearSpringForce(sb.z, u_k2, L20);

    vec4 f;
    f.x = -2.0 * TOTAL_M * l1 * sa.w * sa.y
          - 2.0 * M2 * l1 * sb.w * sb.y * cosD
          - M2 * l1 * l2 * w2sq * sinD
          - TOTAL_M * G * l1 * sin(sa.x);
    f.y = TOTAL_M * l1 * w1sq
          + M2 * l2 * w2sq * cosD
          - 2.0 * M2 * sb.w * sb.y * sinD
          + TOTAL_M * G * cos(sa.x)
          + F_spring1;
    f.z = -2.0 * M2 * l2 * sa.w * sa.y * cosD
          - 2.0 * M2 * l2 * sb.w * sb.y
          + M2 * l1 * l2 * w1sq * sinD
          - M2 * G * l2 * sin(sb.x);
    f.w = 2.0 * M2 * sa.w * sa.y * sinD
          + M2 * l1 * w1sq * cosD
          + M2 * l2 * w2sq
          + M2 * G * cos(sb.x)
          + F_spring2;

    vec4 accel = solveCramer4(M, f);
    da = vec4(sa.y, accel.x, sa.w, accel.y);
    db = vec4(sb.y, accel.z, sb.w, accel.w);
}
`,S=`// Compute bob2 position given angles and arm lengths
// Defines: computeBob2(theta1, theta2, l1, l2, out x2, out y2)

void computeBob2(float theta1, float theta2, float l1, float l2, out float x2, out float y2) {
    float x1 = l1 * sin(theta1);
    float y1 = -l1 * cos(theta1);
    x2 = x1 + l2 * sin(theta2);
    y2 = y1 - l2 * cos(theta2);
}
`,z=`// Hash function for random perturbation
// Defines: hash(vec2 p) -> float

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,p=`#version 300 es
precision highp float;
`;class P{static buildInit(t,e){return t==="rigid"?e==="distance"?this.rigidDistanceInit():this.rigidDivergenceInit():t==="nonlinear"?e==="distance"?this.nonlinearDistanceInit():this.nonlinearDivergenceInit():e==="distance"?this.elasticDistanceInit():this.elasticDivergenceInit()}static buildPhysics(t){return t==="rigid"?this.rigidPhysics():t==="nonlinear"?this.nonlinearPhysics():this.elasticPhysics()}static buildAccumulate(t){return t==="rigid"?this.rigidAccumulate():t==="nonlinear"?this.nonlinearAccumulate():this.elasticAccumulate()}static buildDivergenceStep(t){return t==="rigid"?this.rigidDivergenceStep():t==="nonlinear"?this.nonlinearDivergenceStep():this.elasticDivergenceStep()}static mappingHelpers(){return`
void applyMapping(inout vec4 a, inout vec4 b, int dim, float value) {
    if (dim == 0) a.x += value;
    else if (dim == 1) a.y += value;
    else if (dim == 2) a.z += value;
    else if (dim == 3) a.w += value;
    else if (dim == 4) b.x += value;
    else if (dim == 5) b.y += value;
    else if (dim == 6) b.z += value;
    else if (dim == 7) b.w += value;
}
`}static rigidDistanceInit(){return`${p}
uniform vec4 u_initialState;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
in vec2 v_uv;
layout(location = 0) out vec4 fragColor;

void main() {
    vec4 state = u_initialState;
    float dx = mix(u_xRange.x, u_xRange.y, v_uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, v_uv.y);
    // rigid state layout: (angle1, velocity1, angle2, velocity2)
    if (u_xDim == 0) state.x += dx;
    else if (u_xDim == 1) state.y += dx;
    else if (u_xDim == 4) state.z += dx;
    else if (u_xDim == 5) state.w += dx;
    if (u_yDim == 0) state.x += dy;
    else if (u_yDim == 1) state.y += dy;
    else if (u_yDim == 4) state.z += dy;
    else if (u_yDim == 5) state.w += dy;
    fragColor = state;
}`}static rigidDivergenceInit(){return`${p}
uniform vec4 u_initialState;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform float u_perturb;
uniform float u_seed;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;

${z}

void main() {
    vec4 state = u_initialState;
    float dx = mix(u_xRange.x, u_xRange.y, v_uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, v_uv.y);
    // rigid state layout: (angle1, velocity1, angle2, velocity2)
    if (u_xDim == 0) state.x += dx;
    else if (u_xDim == 1) state.y += dx;
    else if (u_xDim == 4) state.z += dx;
    else if (u_xDim == 5) state.w += dx;
    if (u_yDim == 0) state.x += dy;
    else if (u_yDim == 1) state.y += dy;
    else if (u_yDim == 4) state.z += dy;
    else if (u_yDim == 5) state.w += dy;

    float r = hash(v_uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(v_uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;

    baseState = state;
    perturbedState = state + vec4(perturb_theta1, 0.0, perturb_theta2, 0.0);
    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`}static elasticDistanceInit(){return`${p}
uniform vec4 u_initialA;
uniform vec4 u_initialB;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
in vec2 v_uv;
layout(location = 0) out vec4 stateA;
layout(location = 1) out vec4 stateB;

${this.mappingHelpers()}

void main() {
    vec4 a = u_initialA;
    vec4 b = u_initialB;
    float dx = mix(u_xRange.x, u_xRange.y, v_uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, v_uv.y);
    applyMapping(a, b, u_xDim, dx);
    applyMapping(a, b, u_yDim, dy);
    stateA = a;
    stateB = b;
}`}static nonlinearDistanceInit(){return this.elasticDistanceInit()}static nonlinearDivergenceInit(){return`${p}
uniform vec4 u_initialA;
uniform vec4 u_initialB;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform float u_perturb;
uniform float u_seed;
in vec2 v_uv;
layout(location = 0) out vec4 baseA;
layout(location = 1) out vec4 baseB;
layout(location = 2) out vec4 pertA;
layout(location = 3) out vec4 pertB;
layout(location = 4) out vec4 divergenceData;

${z}
${this.mappingHelpers()}

void main() {
    vec4 a = u_initialA;
    vec4 b = u_initialB;
    float dx = mix(u_xRange.x, u_xRange.y, v_uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, v_uv.y);
    applyMapping(a, b, u_xDim, dx);
    applyMapping(a, b, u_yDim, dy);

    float r = hash(v_uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(v_uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;

    baseA = a;
    baseB = b;
    pertA = a + vec4(perturb_theta1, 0.0, 0.0, 0.0);
    pertB = b + vec4(perturb_theta2, 0.0, 0.0, 0.0);

    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`}static elasticDivergenceInit(){return`${p}
uniform vec4 u_initialA;
uniform vec4 u_initialB;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform float u_perturb;
uniform float u_seed;
in vec2 v_uv;
layout(location = 0) out vec4 baseA;
layout(location = 1) out vec4 baseB;
layout(location = 2) out vec4 pertA;
layout(location = 3) out vec4 pertB;
layout(location = 4) out vec4 divergenceData;

${z}
${this.mappingHelpers()}

void main() {
    vec4 a = u_initialA;
    vec4 b = u_initialB;
    float dx = mix(u_xRange.x, u_xRange.y, v_uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, v_uv.y);
    applyMapping(a, b, u_xDim, dx);
    applyMapping(a, b, u_yDim, dy);

    float r = hash(v_uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(v_uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;

    baseA = a;
    baseB = b;
    pertA = a + vec4(perturb_theta1, 0.0, 0.0, 0.0);
    pertB = b + vec4(perturb_theta2, 0.0, 0.0, 0.0);

    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`}static rigidPhysics(){return`${p}
uniform sampler2D u_stateTexture;
uniform float u_dt;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
out vec4 fragColor;

${O}

void main() {
    vec4 state = texture(u_stateTexture, v_uv);
    float theta1 = state.x, omega1 = state.y, theta2 = state.z, omega2 = state.w;

    vec2 accel = computeAccelerations(theta1, omega1, theta2, omega2);
    float omega1_half = omega1 + 0.5 * u_dt * accel.x;
    float omega2_half = omega2 + 0.5 * u_dt * accel.y;
    float theta1_new = theta1 + u_dt * omega1_half;
    float theta2_new = theta2 + u_dt * omega2_half;
    vec2 accel_new = computeAccelerations(theta1_new, omega1_half, theta2_new, omega2_half);
    float omega1_new = omega1_half + 0.5 * u_dt * accel_new.x;
    float omega2_new = omega2_half + 0.5 * u_dt * accel_new.y;

    fragColor = vec4(theta1_new, omega1_new, theta2_new, omega2_new);
}`}static elasticPhysics(){return`${p}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform float u_dt;
uniform float u_k1;
uniform float u_k2;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
layout(location = 0) out vec4 outStateA;
layout(location = 1) out vec4 outStateB;

${k}

void main() {
    vec4 sa = texture(u_stateTextureA, v_uv);
    vec4 sb = texture(u_stateTextureB, v_uv);

    float dt = u_dt;
    vec4 da1, db1, da2, db2, da3, db3, da4, db4;
    systemDeriv(sa, sb, da1, db1);
    systemDeriv(sa + 0.5*dt*da1, sb + 0.5*dt*db1, da2, db2);
    systemDeriv(sa + 0.5*dt*da2, sb + 0.5*dt*db2, da3, db3);
    systemDeriv(sa + dt*da3, sb + dt*db3, da4, db4);

    outStateA = sa + (dt / 6.0) * (da1 + 2.0*da2 + 2.0*da3 + da4);
    outStateB = sb + (dt / 6.0) * (db1 + 2.0*db2 + 2.0*db3 + db4);
}`}static nonlinearPhysics(){return`${p}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform float u_dt;
uniform float u_k1;
uniform float u_k2;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
layout(location = 0) out vec4 outStateA;
layout(location = 1) out vec4 outStateB;

${H}

void main() {
    vec4 sa = texture(u_stateTextureA, v_uv);
    vec4 sb = texture(u_stateTextureB, v_uv);

    float dt = u_dt;
    vec4 da1, db1, da2, db2, da3, db3, da4, db4;
    systemDeriv(sa, sb, da1, db1);
    systemDeriv(sa + 0.5*dt*da1, sb + 0.5*dt*db1, da2, db2);
    systemDeriv(sa + 0.5*dt*da2, sb + 0.5*dt*db2, da3, db3);
    systemDeriv(sa + dt*da3, sb + dt*db3, da4, db4);

    outStateA = sa + (dt / 6.0) * (da1 + 2.0*da2 + 2.0*da3 + da4);
    outStateB = sb + (dt / 6.0) * (db1 + 2.0*db2 + 2.0*db3 + db4);
}`}static rigidAccumulate(){return`${p}
uniform sampler2D u_stateTexture;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${S}

void main() {
    vec4 state = texture(u_stateTexture, v_uv);
    float theta1 = state.x, theta2 = state.z;

    float bx2, by2;
    computeBob2(theta1, theta2, 1.0, 1.0, bx2, by2);

    vec4 prevData = texture(u_distanceTexture, v_uv);
    float totalDist = prevData.z;
    float valid = prevData.w;

    float newDist = (u_reset || valid < 0.5) ? 0.0
        : totalDist + sqrt((bx2-prevData.x)*(bx2-prevData.x) + (by2-prevData.y)*(by2-prevData.y));
    fragColor = vec4(bx2, by2, newDist, 1.0);
}`}static elasticAccumulate(){return`${p}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${S}

void main() {
    vec4 sa = texture(u_stateTextureA, v_uv);
    vec4 sb = texture(u_stateTextureB, v_uv);

    float theta1 = sa.x, theta2 = sb.x, r1 = sa.z, r2 = sb.z;

    float bx2, by2;
    computeBob2(theta1, theta2, 1.0 + r1, 1.0 + r2, bx2, by2);

    vec4 prevData = texture(u_distanceTexture, v_uv);
    float totalDist = prevData.z;
    float valid = prevData.w;

    float newDist = (u_reset || valid < 0.5) ? 0.0
        : totalDist + sqrt((bx2-prevData.x)*(bx2-prevData.x) + (by2-prevData.y)*(by2-prevData.y));
    fragColor = vec4(bx2, by2, newDist, 1.0);
}`}static nonlinearAccumulate(){return`${p}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${S}

void main() {
    vec4 sa = texture(u_stateTextureA, v_uv);
    vec4 sb = texture(u_stateTextureB, v_uv);

    float theta1 = sa.x, theta2 = sb.x, r1 = sa.z, r2 = sb.z;

    float bx2, by2;
    computeBob2(theta1, theta2, 1.0 + r1, 1.0 + r2, bx2, by2);

    vec4 prevData = texture(u_distanceTexture, v_uv);
    float totalDist = prevData.z;
    float valid = prevData.w;

    float newDist = (u_reset || valid < 0.5) ? 0.0
        : totalDist + sqrt((bx2-prevData.x)*(bx2-prevData.x) + (by2-prevData.y)*(by2-prevData.y));
    fragColor = vec4(bx2, by2, newDist, 1.0);
}`}static rigidDivergenceStep(){return`${p}
uniform sampler2D u_stateTexture;
uniform sampler2D u_perturbedTexture;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform int u_currentIter;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;

const float PI = 3.14159265359;

${O}

float circularDiff(float a, float b) {
    float d = a - b;
    return d - 2.0 * PI * floor(d / (2.0 * PI) + 0.5);
}

float measureDivergence(float t1a, float o1a, float t2a, float o2a,
                        float t1b, float o1b, float t2b, float o2b) {
    float d1 = circularDiff(t1a, t1b);
    float d2 = circularDiff(t2a, t2b);
    return sqrt(d1*d1 + d2*d2 + (o1a-o1b)*(o1a-o1b) + (o2a-o2b)*(o2a-o2b));
}

void verletStep(inout float t1, inout float o1, inout float t2, inout float o2) {
    vec2 accel = computeAccelerations(t1, o1, t2, o2);
    float o1h = o1 + 0.5 * u_dt * accel.x;
    float o2h = o2 + 0.5 * u_dt * accel.y;
    t1 += u_dt * o1h;
    t2 += u_dt * o2h;
    vec2 accelN = computeAccelerations(t1, o1h, t2, o2h);
    o1 = o1h + 0.5 * u_dt * accelN.x;
    o2 = o2h + 0.5 * u_dt * accelN.y;
}

void main() {
    vec4 base = texture(u_stateTexture, v_uv);
    vec4 pert = texture(u_perturbedTexture, v_uv);
    vec4 div = texture(u_divergenceTexture, v_uv);

    float iter = div.r;
    float hasDiv = div.g;

    float bt1 = base.x, bo1 = base.y, bt2 = base.z, bo2 = base.w;
    float pt1 = pert.x, po1 = pert.y, pt2 = pert.z, po2 = pert.w;

    verletStep(bt1, bo1, bt2, bo2);
    verletStep(pt1, po1, pt2, po2);

    if (hasDiv < 0.5) {
        float dist = measureDivergence(bt1, bo1, bt2, bo2, pt1, po1, pt2, po2);
        if (dist > 0.05) {
            iter = float(u_currentIter);
            hasDiv = 1.0;
        }
    }

    baseState = vec4(bt1, bo1, bt2, bo2);
    perturbedState = vec4(pt1, po1, pt2, po2);
    divergenceData = vec4(iter, hasDiv, 0.0, 1.0);
}`}static elasticDivergenceStep(){return`${p}
uniform sampler2D u_baseTextureA;
uniform sampler2D u_baseTextureB;
uniform sampler2D u_pertTextureA;
uniform sampler2D u_pertTextureB;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform int u_currentIter;
uniform float u_k1;
uniform float u_k2;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
layout(location = 0) out vec4 outBaseA;
layout(location = 1) out vec4 outBaseB;
layout(location = 2) out vec4 outPertA;
layout(location = 3) out vec4 outPertB;
layout(location = 4) out vec4 divergenceData;

const float PI = 3.14159265359;

${k}

float circularDiff(float a, float b) {
    float d = a - b;
    return d - 2.0 * PI * floor(d / (2.0 * PI) + 0.5);
}

float measureElasticDivergence(vec4 bA, vec4 bB, vec4 pA, vec4 pB) {
    float d_t1 = circularDiff(bA.x, pA.x);
    float d_o1 = bA.y - pA.y;
    float d_t2 = circularDiff(bB.x, pB.x);
    float d_o2 = bB.y - pB.y;
    float d_r1 = bA.z - pA.z;
    float d_rd1 = bA.w - pA.w;
    float d_r2 = bB.z - pB.z;
    float d_rd2 = bB.w - pB.w;
    return sqrt(d_t1*d_t1 + d_o1*d_o1 + d_t2*d_t2 + d_o2*d_o2 + d_r1*d_r1 + d_rd1*d_rd1 + d_r2*d_r2 + d_rd2*d_rd2);
}

void elasticStep(vec4 sa, vec4 sb, out vec4 newSA, out vec4 newSB) {
    float dt = u_dt;
    vec4 da1, db1, da2, db2, da3, db3, da4, db4;
    systemDeriv(sa, sb, da1, db1);
    systemDeriv(sa + 0.5*dt*da1, sb + 0.5*dt*db1, da2, db2);
    systemDeriv(sa + 0.5*dt*da2, sb + 0.5*dt*db2, da3, db3);
    systemDeriv(sa + dt*da3, sb + dt*db3, da4, db4);

    newSA = sa + (dt / 6.0) * (da1 + 2.0*da2 + 2.0*da3 + da4);
    newSB = sb + (dt / 6.0) * (db1 + 2.0*db2 + 2.0*db3 + db4);
}

void main() {
    vec4 bA = texture(u_baseTextureA, v_uv);
    vec4 bB = texture(u_baseTextureB, v_uv);
    vec4 pA = texture(u_pertTextureA, v_uv);
    vec4 pB = texture(u_pertTextureB, v_uv);
    vec4 div = texture(u_divergenceTexture, v_uv);

    float iter = div.r;
    float hasDiv = div.g;

    vec4 newBA, newBB, newPA, newPB;
    elasticStep(bA, bB, newBA, newBB);
    elasticStep(pA, pB, newPA, newPB);

    if (hasDiv < 0.5) {
        float dist = measureElasticDivergence(newBA, newBB, newPA, newPB);
        if (dist > 0.05) {
            iter = float(u_currentIter);
            hasDiv = 1.0;
        }
    }

    outBaseA = newBA;
    outBaseB = newBB;
    outPertA = newPA;
    outPertB = newPB;
    divergenceData = vec4(iter, hasDiv, 0.0, 1.0);
}`}static nonlinearDivergenceStep(){return`${p}
uniform sampler2D u_baseTextureA;
uniform sampler2D u_baseTextureB;
uniform sampler2D u_pertTextureA;
uniform sampler2D u_pertTextureB;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform int u_currentIter;
uniform float u_k1;
uniform float u_k2;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
layout(location = 0) out vec4 outBaseA;
layout(location = 1) out vec4 outBaseB;
layout(location = 2) out vec4 outPertA;
layout(location = 3) out vec4 outPertB;
layout(location = 4) out vec4 divergenceData;

const float PI = 3.14159265359;

${H}

float circularDiff(float a, float b) {
    float d = a - b;
    return d - 2.0 * PI * floor(d / (2.0 * PI) + 0.5);
}

float measureElasticDivergence(vec4 bA, vec4 bB, vec4 pA, vec4 pB) {
    float d_t1 = circularDiff(bA.x, pA.x);
    float d_o1 = bA.y - pA.y;
    float d_t2 = circularDiff(bB.x, pB.x);
    float d_o2 = bB.y - pB.y;
    float d_r1 = bA.z - pA.z;
    float d_rd1 = bA.w - pA.w;
    float d_r2 = bB.z - pB.z;
    float d_rd2 = bB.w - pB.w;
    return sqrt(d_t1*d_t1 + d_o1*d_o1 + d_t2*d_t2 + d_o2*d_o2 + d_r1*d_r1 + d_rd1*d_rd1 + d_r2*d_r2 + d_rd2*d_rd2);
}

void elasticStep(vec4 sa, vec4 sb, out vec4 newSA, out vec4 newSB) {
    float dt = u_dt;
    vec4 da1, db1, da2, db2, da3, db3, da4, db4;
    systemDeriv(sa, sb, da1, db1);
    systemDeriv(sa + 0.5*dt*da1, sb + 0.5*dt*db1, da2, db2);
    systemDeriv(sa + 0.5*dt*da2, sb + 0.5*dt*db2, da3, db3);
    systemDeriv(sa + dt*da3, sb + dt*db3, da4, db4);

    newSA = sa + (dt / 6.0) * (da1 + 2.0*da2 + 2.0*da3 + da4);
    newSB = sb + (dt / 6.0) * (db1 + 2.0*db2 + 2.0*db3 + db4);
}

void main() {
    vec4 bA = texture(u_baseTextureA, v_uv);
    vec4 bB = texture(u_baseTextureB, v_uv);
    vec4 pA = texture(u_pertTextureA, v_uv);
    vec4 pB = texture(u_pertTextureB, v_uv);
    vec4 div = texture(u_divergenceTexture, v_uv);

    float iter = div.r;
    float hasDiv = div.g;

    vec4 newBA, newBB, newPA, newPB;
    elasticStep(bA, bB, newBA, newBB);
    elasticStep(pA, pB, newPA, newPB);

    if (hasDiv < 0.5) {
        float dist = measureElasticDivergence(newBA, newBB, newPA, newPB);
        if (dist > 0.05) {
            iter = float(u_currentIter);
            hasDiv = 1.0;
        }
    }

    outBaseA = newBA;
    outBaseB = newBB;
    outPertA = newPA;
    outPertB = newPB;
    divergenceData = vec4(iter, hasDiv, 0.0, 1.0);
}`}static buildPreviewPhysicsLoop(t){return t==="rigid"?this.previewRigidPhysicsLoop():t==="nonlinear"?this.previewNonlinearPhysicsLoop():this.previewElasticPhysicsLoop()}static buildPreviewInit(t){return t==="rigid"?this.previewRigidInit():t==="nonlinear"?this.previewNonlinearInit():this.previewElasticInit()}static buildPreviewDivergenceCheck(t){return t==="rigid"?this.previewRigidDivCheck():t==="nonlinear"?this.previewNonlinearDivCheck():this.previewElasticDivCheck()}static buildPreviewTrailAppend(t){return t==="rigid"?this.previewRigidTrailAppend():t==="nonlinear"?this.previewNonlinearTrailAppend():this.previewElasticTrailAppend()}static buildPreviewRender(t){return t==="rigid"?this.previewRigidRender():t==="nonlinear"?this.previewNonlinearRender():this.previewElasticRender()}static previewRigidPhysicsLoop(){return`${p}
uniform sampler2D u_stateTexture;
uniform float u_dt;
uniform int u_steps;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
out vec4 fragColor;

${O}

void main() {
    vec4 s = texelFetch(u_stateTexture, ivec2(0, 0), 0);
    float theta1 = s.x, omega1 = s.y, theta2 = s.z, omega2 = s.w;

    for (int i = 0; i < 100; i++) {
        if (i >= u_steps) break;
        vec2 accel = computeAccelerations(theta1, omega1, theta2, omega2);
        float oh1 = omega1 + 0.5 * u_dt * accel.x;
        float oh2 = omega2 + 0.5 * u_dt * accel.y;
        theta1 += u_dt * oh1;
        theta2 += u_dt * oh2;
        vec2 an = computeAccelerations(theta1, oh1, theta2, oh2);
        omega1 = oh1 + 0.5 * u_dt * an.x;
        omega2 = oh2 + 0.5 * u_dt * an.y;
    }

    fragColor = vec4(theta1, omega1, theta2, omega2);
}`}static previewElasticPhysicsLoop(){return`${p}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform float u_dt;
uniform int u_steps;
uniform float u_k1;
uniform float u_k2;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
layout(location = 0) out vec4 outStateA;
layout(location = 1) out vec4 outStateB;

${k}

void main() {
    vec4 sa = texelFetch(u_stateTextureA, ivec2(0, 0), 0);
    vec4 sb = texelFetch(u_stateTextureB, ivec2(0, 0), 0);

    for (int i = 0; i < 100; i++) {
        if (i >= u_steps) break;

        float dt = u_dt;
        vec4 da1, db1, da2, db2, da3, db3, da4, db4;
        systemDeriv(sa, sb, da1, db1);
        systemDeriv(sa + 0.5*dt*da1, sb + 0.5*dt*db1, da2, db2);
        systemDeriv(sa + 0.5*dt*da2, sb + 0.5*dt*db2, da3, db3);
        systemDeriv(sa + dt*da3, sb + dt*db3, da4, db4);

        sa = sa + (dt / 6.0) * (da1 + 2.0*da2 + 2.0*da3 + da4);
        sb = sb + (dt / 6.0) * (db1 + 2.0*db2 + 2.0*db3 + db4);
    }

    outStateA = sa;
    outStateB = sb;
}`}static previewNonlinearPhysicsLoop(){return`${p}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform float u_dt;
uniform int u_steps;
uniform float u_k1;
uniform float u_k2;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
layout(location = 0) out vec4 outStateA;
layout(location = 1) out vec4 outStateB;

${H}

void main() {
    vec4 sa = texelFetch(u_stateTextureA, ivec2(0, 0), 0);
    vec4 sb = texelFetch(u_stateTextureB, ivec2(0, 0), 0);

    for (int i = 0; i < 100; i++) {
        if (i >= u_steps) break;

        float dt = u_dt;
        vec4 da1, db1, da2, db2, da3, db3, da4, db4;
        systemDeriv(sa, sb, da1, db1);
        systemDeriv(sa + 0.5*dt*da1, sb + 0.5*dt*db1, da2, db2);
        systemDeriv(sa + 0.5*dt*da2, sb + 0.5*dt*db2, da3, db3);
        systemDeriv(sa + dt*da3, sb + dt*db3, da4, db4);

        sa = sa + (dt / 6.0) * (da1 + 2.0*da2 + 2.0*da3 + da4);
        sb = sb + (dt / 6.0) * (db1 + 2.0*db2 + 2.0*db3 + db4);
    }

    outStateA = sa;
    outStateB = sb;
}`}static previewRigidInit(){return`${p}
uniform vec4 u_initialState;
uniform float u_perturb;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 pertState;

void main() {
    baseState = u_initialState;
    pertState = u_initialState + vec4(u_perturb, 0.0, u_perturb, 0.0);
}`}static previewElasticInit(){return`${p}
uniform vec4 u_initialA;
uniform vec4 u_initialB;
uniform float u_perturb;
in vec2 v_uv;
layout(location = 0) out vec4 baseA;
layout(location = 1) out vec4 baseB;
layout(location = 2) out vec4 pertA;
layout(location = 3) out vec4 pertB;

void main() {
    baseA = u_initialA;
    baseB = u_initialB;
    pertA = u_initialA + vec4(u_perturb, 0.0, 0.0, 0.0);
    pertB = u_initialB + vec4(u_perturb, 0.0, 0.0, 0.0);
}`}static previewNonlinearInit(){return this.previewElasticInit()}static previewRigidDivCheck(){return`${p}
uniform sampler2D u_baseState;
uniform sampler2D u_pertState;
uniform sampler2D u_meta;
in vec2 v_uv;
out vec4 fragColor;

const float PI = 3.14159265359;

float circularDiff(float a, float b) {
    float d = a - b;
    return d - 2.0 * PI * floor(d / (2.0 * PI) + 0.5);
}

void main() {
    vec4 base = texelFetch(u_baseState, ivec2(0, 0), 0);
    vec4 pert = texelFetch(u_pertState, ivec2(0, 0), 0);
    vec4 meta = texelFetch(u_meta, ivec2(0, 0), 0);

    float diverged = meta.r;
    float countAtDiv = meta.g;

    if (diverged < 0.5) {
        float d1 = circularDiff(base.x, pert.x);
        float d2 = circularDiff(base.z, pert.z);
        float dist = sqrt(d1*d1 + d2*d2 + (base.y-pert.y)*(base.y-pert.y) + (base.w-pert.w)*(base.w-pert.w));
        if (dist > 0.05) {
            diverged = 1.0;
        }
    }

    fragColor = vec4(diverged, countAtDiv, 0.0, 0.0);
}`}static previewElasticDivCheck(){return`${p}
uniform sampler2D u_baseA;
uniform sampler2D u_baseB;
uniform sampler2D u_pertA;
uniform sampler2D u_pertB;
uniform sampler2D u_meta;
in vec2 v_uv;
out vec4 fragColor;

const float PI = 3.14159265359;

float circularDiff(float a, float b) {
    float d = a - b;
    return d - 2.0 * PI * floor(d / (2.0 * PI) + 0.5);
}

float measureDiv(vec4 bA, vec4 bB, vec4 pA, vec4 pB) {
    float d_t1 = circularDiff(bA.x, pA.x);
    float d_o1 = bA.y - pA.y;
    float d_t2 = circularDiff(bB.x, pB.x);
    float d_o2 = bB.y - pB.y;
    float d_r1 = bA.z - pA.z;
    float d_rd1 = bA.w - pA.w;
    float d_r2 = bB.z - pB.z;
    float d_rd2 = bB.w - pB.w;
    return sqrt(d_t1*d_t1 + d_o1*d_o1 + d_t2*d_t2 + d_o2*d_o2 + d_r1*d_r1 + d_rd1*d_rd1 + d_r2*d_r2 + d_rd2*d_rd2);
}

void main() {
    vec4 bA = texelFetch(u_baseA, ivec2(0, 0), 0);
    vec4 bB = texelFetch(u_baseB, ivec2(0, 0), 0);
    vec4 pA = texelFetch(u_pertA, ivec2(0, 0), 0);
    vec4 pB = texelFetch(u_pertB, ivec2(0, 0), 0);
    vec4 meta = texelFetch(u_meta, ivec2(0, 0), 0);

    float diverged = meta.r;
    float countAtDiv = meta.g;

    if (diverged < 0.5) {
        float dist = measureDiv(bA, bB, pA, pB);
        if (dist > 0.05) diverged = 1.0;
    }

    fragColor = vec4(diverged, countAtDiv, 0.0, 0.0);
}`}static previewNonlinearDivCheck(){return this.previewElasticDivCheck()}static previewRigidTrailAppend(){return`${p}
uniform sampler2D u_baseState;
in vec2 v_uv;
out vec4 fragColor;

${S}

void main() {
    vec4 state = texelFetch(u_baseState, ivec2(0, 0), 0);
    float x2, y2;
    computeBob2(state.x, state.z, 1.0, 1.0, x2, y2);
    fragColor = vec4(x2, y2, 0.0, 1.0);
}`}static previewElasticTrailAppend(){return`${p}
uniform sampler2D u_baseA;
uniform sampler2D u_baseB;
in vec2 v_uv;
out vec4 fragColor;

${S}

void main() {
    vec4 sa = texelFetch(u_baseA, ivec2(0, 0), 0);
    vec4 sb = texelFetch(u_baseB, ivec2(0, 0), 0);
    float theta1 = sa.x, theta2 = sb.x, r1 = sa.z, r2 = sb.z;
    float x2, y2;
    computeBob2(theta1, theta2, 1.0 + r1, 1.0 + r2, x2, y2);
    fragColor = vec4(x2, y2, 0.0, 1.0);
}`}static previewNonlinearTrailAppend(){return`${p}
uniform sampler2D u_baseA;
uniform sampler2D u_baseB;
in vec2 v_uv;
out vec4 fragColor;

${S}

void main() {
    vec4 sa = texelFetch(u_baseA, ivec2(0, 0), 0);
    vec4 sb = texelFetch(u_baseB, ivec2(0, 0), 0);
    float theta1 = sa.x, theta2 = sb.x, r1 = sa.z, r2 = sb.z;
    float x2, y2;
    computeBob2(theta1, theta2, 1.0 + r1, 1.0 + r2, x2, y2);
    fragColor = vec4(x2, y2, 0.0, 1.0);
}`}static sdfHelpers(){return`
float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float sdCircle(vec2 p, vec2 c, float r) {
    return length(p - c) - r;
}

float sdRoundedBox(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - halfSize + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
`}static previewRigidRender(){return`${p}
uniform sampler2D u_baseState;
uniform sampler2D u_pertState;
uniform sampler2D u_meta;
uniform sampler2D u_trail;
uniform vec2 u_resolution;
uniform vec2 u_boxOrigin;
uniform float u_boxSize;
uniform float u_armScale;
uniform int u_trailHead;
uniform int u_trailCount;
in vec2 v_uv;
out vec4 fragColor;

const int MAX_TRAIL = 500;
const float L1 = 1.0;
const float L2 = 1.0;

${this.sdfHelpers()}
${S}

void main() {
    vec2 pixel = v_uv * u_resolution;
    vec2 boxCenter = u_boxOrigin + vec2(u_boxSize * 0.5);
    vec2 relP = pixel - boxCenter;
    float boxDist = sdRoundedBox(relP, vec2(u_boxSize * 0.5), 10.0);
    if (boxDist > 1.0) { fragColor = vec4(0.0); return; }

    vec4 meta = texelFetch(u_meta, ivec2(0, 0), 0);
    bool diverged = meta.r > 0.5;

    vec3 bgColor = diverged ? vec3(0.12, 0.06, 0.02) : vec3(0.03, 0.04, 0.06);
    float bgAlpha = smoothstep(1.0, -1.0, boxDist) * 0.88;

    int validCount = diverged ? int(meta.g + 0.5) : u_trailCount;

    // Draw trail
    float trailDist = 1e10;
    float invMax = 1.0 / float(MAX_TRAIL);
    for (int i = 0; i < MAX_TRAIL - 1; i++) {
        if (i >= validCount - 1) break;
        int idx0 = (u_trailHead - validCount + i + MAX_TRAIL) - MAX_TRAIL * ((u_trailHead - validCount + i + MAX_TRAIL) / MAX_TRAIL);
        int idx1 = idx0 + 1;
        vec2 p0 = boxCenter + texture(u_trail, vec2((float(idx0) + 0.5) * invMax, 0.5)).xy * u_armScale;
        vec2 p1 = boxCenter + texture(u_trail, vec2((float(idx1) + 0.5) * invMax, 0.5)).xy * u_armScale;
        trailDist = min(trailDist, sdSegment(pixel, p0, p1));
    }

    // Read states
    vec4 base = texelFetch(u_baseState, ivec2(0, 0), 0);
    vec4 pert = texelFetch(u_pertState, ivec2(0, 0), 0);

    float bx1 = L1 * sin(base.x), by1 = -L1 * cos(base.x);
    float bx2, by2;
    computeBob2(base.x, base.z, L1, L2, bx2, by2);
    vec2 baseBob1 = boxCenter + vec2(bx1, by1) * u_armScale;
    vec2 baseBob2 = boxCenter + vec2(bx2, by2) * u_armScale;

    float px1 = L1 * sin(pert.x), py1 = -L1 * cos(pert.x);
    float px2, py2;
    computeBob2(pert.x, pert.z, L1, L2, px2, py2);
    vec2 pertBob1 = boxCenter + vec2(px1, py1) * u_armScale;
    vec2 pertBob2 = boxCenter + vec2(px2, py2) * u_armScale;

    // Composite
    vec3 color = bgColor;
    float alpha = bgAlpha;

    // Trail glow
    float ta = smoothstep(2.5, 0.0, trailDist);
    color = mix(color, vec3(0.0, 0.83, 0.67), ta * (diverged ? 0.3 : 0.7));

    // Perturbed (behind, orange)
    float pa1 = smoothstep(2.0, 0.0, sdSegment(pixel, boxCenter, pertBob1));
    float pa2 = smoothstep(2.0, 0.0, sdSegment(pixel, pertBob1, pertBob2));
    float pb1 = smoothstep(1.5, 0.0, sdCircle(pixel, pertBob1, 2.5));
    float pb2 = smoothstep(1.5, 0.0, sdCircle(pixel, pertBob2, 3.0));
    float pertA = max(max(pa1, pa2), max(pb1, pb2));
    color = mix(color, vec3(0.91, 0.63, 0.19), pertA * 0.4);

    // Main arms
    float ma1 = smoothstep(2.0, 0.0, sdSegment(pixel, boxCenter, baseBob1));
    float ma2 = smoothstep(2.0, 0.0, sdSegment(pixel, baseBob1, baseBob2));
    color = mix(color, vec3(0.78, 0.79, 0.83), max(ma1, ma2) * 0.6);

    // Bob 1
    color = mix(color, vec3(0.78, 0.79, 0.83), smoothstep(1.0, 0.0, sdCircle(pixel, baseBob1, 3.5)) * 0.5);

    // Bob 2 (accent green)
    float b2a = smoothstep(1.5, 0.0, sdCircle(pixel, baseBob2, 4.5));
    color = mix(color, vec3(0.0, 0.83, 0.67), b2a);

    // Pivot
    color = mix(color, vec3(0.78, 0.79, 0.83), smoothstep(1.0, 0.0, sdCircle(pixel, boxCenter, 2.5)) * 0.4);

    // Border
    float borderA = smoothstep(1.0, 0.0, abs(boxDist)) * 0.08;
    color += vec3(borderA);

    fragColor = vec4(color, alpha);
}`}static previewElasticRender(){return`${p}
uniform sampler2D u_baseA;
uniform sampler2D u_baseB;
uniform sampler2D u_pertA;
uniform sampler2D u_pertB;
uniform sampler2D u_meta;
uniform sampler2D u_trail;
uniform vec2 u_resolution;
uniform vec2 u_boxOrigin;
uniform float u_boxSize;
uniform float u_armScale;
uniform int u_trailHead;
uniform int u_trailCount;
in vec2 v_uv;
out vec4 fragColor;

const int MAX_TRAIL = 500;
const float L10 = 1.0;
const float L20 = 1.0;

${this.sdfHelpers()}
${S}

void decodeElastic(vec4 sa, vec4 sb, out float theta1, out float theta2, out float r1, out float r2) {
    theta1 = sa.x; theta2 = sb.x; r1 = sa.z; r2 = sb.z;
}

void main() {
    vec2 pixel = v_uv * u_resolution;
    vec2 boxCenter = u_boxOrigin + vec2(u_boxSize * 0.5);
    vec2 relP = pixel - boxCenter;
    float boxDist = sdRoundedBox(relP, vec2(u_boxSize * 0.5), 10.0);
    if (boxDist > 1.0) { fragColor = vec4(0.0); return; }

    vec4 meta = texelFetch(u_meta, ivec2(0, 0), 0);
    bool diverged = meta.r > 0.5;

    vec3 bgColor = diverged ? vec3(0.12, 0.06, 0.02) : vec3(0.03, 0.04, 0.06);
    float bgAlpha = smoothstep(1.0, -1.0, boxDist) * 0.88;

    int validCount = diverged ? int(meta.g + 0.5) : u_trailCount;

    float trailDist = 1e10;
    float invMax = 1.0 / float(MAX_TRAIL);
    for (int i = 0; i < MAX_TRAIL - 1; i++) {
        if (i >= validCount - 1) break;
        int idx0 = (u_trailHead - validCount + i + MAX_TRAIL) - MAX_TRAIL * ((u_trailHead - validCount + i + MAX_TRAIL) / MAX_TRAIL);
        int idx1 = idx0 + 1;
        vec2 p0 = boxCenter + texture(u_trail, vec2((float(idx0) + 0.5) * invMax, 0.5)).xy * u_armScale;
        vec2 p1 = boxCenter + texture(u_trail, vec2((float(idx1) + 0.5) * invMax, 0.5)).xy * u_armScale;
        trailDist = min(trailDist, sdSegment(pixel, p0, p1));
    }

    vec4 bA = texelFetch(u_baseA, ivec2(0, 0), 0);
    vec4 bB = texelFetch(u_baseB, ivec2(0, 0), 0);
    vec4 pA = texelFetch(u_pertA, ivec2(0, 0), 0);
    vec4 pB = texelFetch(u_pertB, ivec2(0, 0), 0);

    float bt1, bt2, br1, br2;
    decodeElastic(bA, bB, bt1, bt2, br1, br2);
    float bl1 = L10 + br1, bl2 = L20 + br2;
    float bbx1 = bl1 * sin(bt1), bby1 = -bl1 * cos(bt1);
    float bbx2, bby2;
    computeBob2(bt1, bt2, bl1, bl2, bbx2, bby2);
    vec2 baseBob1 = boxCenter + vec2(bbx1, bby1) * u_armScale;
    vec2 baseBob2 = boxCenter + vec2(bbx2, bby2) * u_armScale;

    float pt1, pt2, pr1, pr2;
    decodeElastic(pA, pB, pt1, pt2, pr1, pr2);
    float pl1 = L10 + pr1, pl2 = L20 + pr2;
    float pbx1 = pl1 * sin(pt1), pby1 = -pl1 * cos(pt1);
    float pbx2, pby2;
    computeBob2(pt1, pt2, pl1, pl2, pbx2, pby2);
    vec2 pertBob1 = boxCenter + vec2(pbx1, pby1) * u_armScale;
    vec2 pertBob2 = boxCenter + vec2(pbx2, pby2) * u_armScale;

    vec3 color = bgColor;
    float alpha = bgAlpha;

    float ta = smoothstep(2.5, 0.0, trailDist);
    color = mix(color, vec3(0.0, 0.83, 0.67), ta * (diverged ? 0.3 : 0.7));

    float pa1 = smoothstep(2.0, 0.0, sdSegment(pixel, boxCenter, pertBob1));
    float pa2 = smoothstep(2.0, 0.0, sdSegment(pixel, pertBob1, pertBob2));
    float pb1a = smoothstep(1.5, 0.0, sdCircle(pixel, pertBob1, 2.5));
    float pb2a = smoothstep(1.5, 0.0, sdCircle(pixel, pertBob2, 3.0));
    float pertA = max(max(pa1, pa2), max(pb1a, pb2a));
    color = mix(color, vec3(0.91, 0.63, 0.19), pertA * 0.4);

    float ma1 = smoothstep(2.0, 0.0, sdSegment(pixel, boxCenter, baseBob1));
    float ma2 = smoothstep(2.0, 0.0, sdSegment(pixel, baseBob1, baseBob2));
    color = mix(color, vec3(0.78, 0.79, 0.83), max(ma1, ma2) * 0.6);

    color = mix(color, vec3(0.78, 0.79, 0.83), smoothstep(1.0, 0.0, sdCircle(pixel, baseBob1, 3.5)) * 0.5);
    color = mix(color, vec3(0.0, 0.83, 0.67), smoothstep(1.5, 0.0, sdCircle(pixel, baseBob2, 4.5)));
    color = mix(color, vec3(0.78, 0.79, 0.83), smoothstep(1.0, 0.0, sdCircle(pixel, boxCenter, 2.5)) * 0.4);

    color += vec3(smoothstep(1.0, 0.0, abs(boxDist)) * 0.08);

    fragColor = vec4(color, alpha);
}`}static previewNonlinearRender(){return this.previewElasticRender()}}const U=`#version 300 es
precision highp float;

// Shared vertex shader - used by all programs
in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`,K={angle1:0,velocity1:1,stretch1:2,stretchRate1:3,angle2:4,velocity2:5,stretch2:6,stretchRate2:7};class st{constructor(t,e,i){o(this,"gl");o(this,"config");o(this,"textures");o(this,"fb");o(this,"uniforms");o(this,"systemKey");o(this,"modeKey");o(this,"stateAPair");o(this,"stateBPair",null);o(this,"perturbedAPair",null);o(this,"perturbedBPair",null);o(this,"dataPair");o(this,"readIndex",0);o(this,"frameCount",0);o(this,"isDivergenceComplete",!1);o(this,"framebuffer");o(this,"programs",new Map);o(this,"intervalId",null);o(this,"renderIntervalId",null);o(this,"onDivergenceRender",null);this.quadBuffer=i,this.gl=t,this.config=e,this.textures=new $(t),this.fb=new it(t),this.uniforms=new q(t),this.systemKey=e.system==="elastic12"?"elastic":e.system,this.modeKey=e.vizMode;const s=e.resolution;this.stateAPair=this.textures.createTexturePair(s),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&(this.stateBPair=this.textures.createTexturePair(s)),this.modeKey==="divergence"&&(this.perturbedAPair=this.textures.createTexturePair(s),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&(this.perturbedBPair=this.textures.createTexturePair(s))),this.dataPair=this.textures.createTexturePair(s),this.framebuffer=t.createFramebuffer(),this.compilePrograms()}compilePrograms(){const t=new V(this.gl),e=P,i=e.buildInit(this.systemKey,this.modeKey);if(this.compileAndStore(t,"init",i),this.modeKey==="distance"){const s=e.buildPhysics(this.systemKey),a=e.buildAccumulate(this.systemKey);this.compileAndStore(t,"physics",s),this.compileAndStore(t,"accumulate",a)}else{const s=e.buildDivergenceStep(this.systemKey);this.compileAndStore(t,"divergeStep",s)}}compileAndStore(t,e,i){const s=t.linkProgram(U,i,e),a=this.gl.createVertexArray();this.gl.bindVertexArray(a),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.quadBuffer);const r=this.gl.getAttribLocation(s.program,"a_position");r>=0&&(this.gl.enableVertexAttribArray(r),this.gl.vertexAttribPointer(r,2,this.gl.FLOAT,!1,0,0)),this.gl.bindVertexArray(null),this.programs.set(e,{program:s.program,vao:a})}getProg(t){const e=this.programs.get(t);if(!e)throw new Error(`Program not found: ${t}`);return e}setPhaseSpaceUniforms(t){const e=this.config.phaseSpace,i=e.initialValues;this.systemKey==="rigid"?this.uniforms.set4f(t,"u_initialState",i.angle1,i.velocity1,i.angle2,i.velocity2):(this.uniforms.set4f(t,"u_initialA",i.angle1,i.velocity1,i.stretch1,i.stretchRate1),this.uniforms.set4f(t,"u_initialB",i.angle2,i.velocity2,i.stretch2,i.stretchRate2)),this.uniforms.set2f(t,"u_xRange",e.x.min,e.x.max),this.uniforms.set2f(t,"u_yRange",e.y.min,e.y.max),this.uniforms.set1i(t,"u_xDim",K[e.x.dimension]),this.uniforms.set1i(t,"u_yDim",K[e.y.dimension])}reset(){this.readIndex=0,this.frameCount=0,this.isDivergenceComplete=!1;const t=this.gl,e=this.config.resolution,i=this.readIndex,s=1;t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer),this.modeKey==="distance"?(this.initDistanceState(i,s,e),this.initDistanceData(i,s,e)):this.initDivergenceState(i,s,e),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindVertexArray(null)}initDistanceState(t,e,i){const s=this.gl,a=this.getProg("init");s.useProgram(a.program),s.bindVertexArray(a.vao),this.setPhaseSpaceUniforms(a.program),this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.fb.attachColor(s.COLOR_ATTACHMENT0,this.stateAPair[t]),this.fb.attachColor(s.COLOR_ATTACHMENT1,this.stateBPair[t]),s.drawBuffers([s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1])):(this.fb.attachColor(s.COLOR_ATTACHMENT0,this.stateAPair[t]),s.drawBuffers([s.COLOR_ATTACHMENT0])),s.viewport(0,0,i,i),s.drawArrays(s.TRIANGLE_STRIP,0,4)}initDistanceData(t,e,i){const s=this.gl,a=this.getProg("accumulate");s.useProgram(a.program),s.bindVertexArray(a.vao),this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.textures.bindTexture(0,this.stateAPair[t]),this.textures.bindTexture(1,this.stateBPair[t]),this.uniforms.set1i(a.program,"u_stateTextureA",0),this.uniforms.set1i(a.program,"u_stateTextureB",1)):(this.textures.bindTexture(0,this.stateAPair[t]),this.uniforms.set1i(a.program,"u_stateTexture",0)),this.textures.bindTexture(this.systemKey==="elastic"||this.systemKey==="nonlinear"?2:1,this.dataPair[t]),this.uniforms.set1i(a.program,"u_distanceTexture",this.systemKey==="elastic"||this.systemKey==="nonlinear"?2:1),this.uniforms.set1b(a.program,"u_reset",!0),this.fb.attachColor(s.COLOR_ATTACHMENT0,this.dataPair[e]),s.drawBuffers([s.COLOR_ATTACHMENT0]),s.viewport(0,0,i,i),s.drawArrays(s.TRIANGLE_STRIP,0,4),[this.dataPair[0],this.dataPair[1]]=[this.dataPair[1],this.dataPair[0]]}initDivergenceState(t,e,i){const s=this.gl,a=this.getProg("init");s.useProgram(a.program),s.bindVertexArray(a.vao),this.setPhaseSpaceUniforms(a.program),this.uniforms.set1f(a.program,"u_perturb",this.config.perturb),this.uniforms.set1f(a.program,"u_seed",this.config.seed);const r=[];this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.fb.attachColor(s.COLOR_ATTACHMENT0,this.stateAPair[t]),this.fb.attachColor(s.COLOR_ATTACHMENT1,this.stateBPair[t]),this.fb.attachColor(s.COLOR_ATTACHMENT2,this.perturbedAPair[t]),this.fb.attachColor(s.COLOR_ATTACHMENT3,this.perturbedBPair[t]),this.fb.attachColor(s.COLOR_ATTACHMENT4,this.dataPair[t]),r.push(s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1,s.COLOR_ATTACHMENT2,s.COLOR_ATTACHMENT3,s.COLOR_ATTACHMENT4)):(this.fb.attachColor(s.COLOR_ATTACHMENT0,this.stateAPair[t]),this.fb.attachColor(s.COLOR_ATTACHMENT1,this.perturbedAPair[t]),this.fb.attachColor(s.COLOR_ATTACHMENT2,this.dataPair[t]),r.push(s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1,s.COLOR_ATTACHMENT2)),s.drawBuffers(r),s.viewport(0,0,i,i),s.drawArrays(s.TRIANGLE_STRIP,0,4)}stepDistance(){const t=this.gl,e=this.config.resolution;t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer);for(let i=0;i<this.config.iterationsPerFrame;i++){const s=this.readIndex,a=1-this.readIndex;this.stepPhysics(s,a,e),this.stepAccumulate(a,s,a,e),this.readIndex=a}t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindVertexArray(null),this.frameCount+=this.config.iterationsPerFrame}stepPhysics(t,e,i){const s=this.gl,a=this.getProg("physics");s.useProgram(a.program),s.bindVertexArray(a.vao),this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.textures.bindTexture(0,this.stateAPair[t]),this.textures.bindTexture(1,this.stateBPair[t]),this.uniforms.set1i(a.program,"u_stateTextureA",0),this.uniforms.set1i(a.program,"u_stateTextureB",1),this.uniforms.set1f(a.program,"u_k1",this.config.k1),this.uniforms.set1f(a.program,"u_k2",this.config.k2),this.uniforms.set1f(a.program,"u_m1",this.config.m1),this.uniforms.set1f(a.program,"u_m2",this.config.m2),this.uniforms.set1f(a.program,"u_L1",this.config.L1),this.uniforms.set1f(a.program,"u_L2",this.config.L2),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,null,0),this.fb.attachColor(s.COLOR_ATTACHMENT0,this.stateAPair[e]),this.fb.attachColor(s.COLOR_ATTACHMENT1,this.stateBPair[e]),s.drawBuffers([s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1])):(this.textures.bindTexture(0,this.stateAPair[t]),this.uniforms.set1i(a.program,"u_stateTexture",0),this.uniforms.set1f(a.program,"u_m1",this.config.m1),this.uniforms.set1f(a.program,"u_m2",this.config.m2),this.uniforms.set1f(a.program,"u_L1",this.config.L1),this.uniforms.set1f(a.program,"u_L2",this.config.L2),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,null,0),this.fb.attachColor(s.COLOR_ATTACHMENT0,this.stateAPair[e]),s.drawBuffers([s.COLOR_ATTACHMENT0])),this.uniforms.set1f(a.program,"u_dt",this.config.dt),s.viewport(0,0,i,i),s.drawArrays(s.TRIANGLE_STRIP,0,4)}stepAccumulate(t,e,i,s){const a=this.gl,r=this.getProg("accumulate");a.useProgram(r.program),a.bindVertexArray(r.vao),this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.textures.bindTexture(0,this.stateAPair[t]),this.textures.bindTexture(1,this.stateBPair[t]),this.textures.bindTexture(2,this.dataPair[e]),this.uniforms.set1i(r.program,"u_stateTextureA",0),this.uniforms.set1i(r.program,"u_stateTextureB",1),this.uniforms.set1i(r.program,"u_distanceTexture",2)):(this.textures.bindTexture(0,this.stateAPair[t]),this.textures.bindTexture(1,this.dataPair[e]),this.uniforms.set1i(r.program,"u_stateTexture",0),this.uniforms.set1i(r.program,"u_distanceTexture",1)),this.uniforms.set1b(r.program,"u_reset",!1),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT1,a.TEXTURE_2D,null,0),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,null,0),this.fb.attachColor(a.COLOR_ATTACHMENT0,this.dataPair[i]),a.drawBuffers([a.COLOR_ATTACHMENT0]),a.viewport(0,0,s,s),a.drawArrays(a.TRIANGLE_STRIP,0,4)}startDivergence(t){this.stopDivergence(),this.onDivergenceRender=t,this.reset(),this.intervalId=window.setInterval(()=>{if(this.frameCount>=this.config.maxIter){this.isDivergenceComplete=!0,this.stopDivergence();return}this.stepDivergenceBatch()},20),this.renderIntervalId=window.setInterval(()=>{this.onDivergenceRender&&this.onDivergenceRender()},500)}stopDivergence(){this.intervalId!==null&&(clearInterval(this.intervalId),this.intervalId=null),this.renderIntervalId!==null&&(clearInterval(this.renderIntervalId),this.renderIntervalId=null)}stepDivergenceBatch(){const t=this.gl,e=this.config.resolution,i=20;t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer);for(let s=0;s<i&&!(this.frameCount>=this.config.maxIter);s++){this.frameCount++;const a=this.readIndex,r=1-this.readIndex;this.stepDivergeOnce(a,r,e),this.readIndex=r}t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindVertexArray(null)}stepDivergeOnce(t,e,i){const s=this.gl,a=this.getProg("divergeStep");s.useProgram(a.program),s.bindVertexArray(a.vao),this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.textures.bindTexture(0,this.stateAPair[t]),this.textures.bindTexture(1,this.stateBPair[t]),this.textures.bindTexture(2,this.perturbedAPair[t]),this.textures.bindTexture(3,this.perturbedBPair[t]),this.textures.bindTexture(4,this.dataPair[t]),this.uniforms.set1i(a.program,"u_baseTextureA",0),this.uniforms.set1i(a.program,"u_baseTextureB",1),this.uniforms.set1i(a.program,"u_pertTextureA",2),this.uniforms.set1i(a.program,"u_pertTextureB",3),this.uniforms.set1i(a.program,"u_divergenceTexture",4),this.uniforms.set1f(a.program,"u_k1",this.config.k1),this.uniforms.set1f(a.program,"u_k2",this.config.k2),this.uniforms.set1f(a.program,"u_m1",this.config.m1),this.uniforms.set1f(a.program,"u_m2",this.config.m2),this.uniforms.set1f(a.program,"u_L1",this.config.L1),this.uniforms.set1f(a.program,"u_L2",this.config.L2),this.fb.attachColor(s.COLOR_ATTACHMENT0,this.stateAPair[e]),this.fb.attachColor(s.COLOR_ATTACHMENT1,this.stateBPair[e]),this.fb.attachColor(s.COLOR_ATTACHMENT2,this.perturbedAPair[e]),this.fb.attachColor(s.COLOR_ATTACHMENT3,this.perturbedBPair[e]),this.fb.attachColor(s.COLOR_ATTACHMENT4,this.dataPair[e]),s.drawBuffers([s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1,s.COLOR_ATTACHMENT2,s.COLOR_ATTACHMENT3,s.COLOR_ATTACHMENT4])):(this.textures.bindTexture(0,this.stateAPair[t]),this.textures.bindTexture(1,this.perturbedAPair[t]),this.textures.bindTexture(2,this.dataPair[t]),this.uniforms.set1i(a.program,"u_stateTexture",0),this.uniforms.set1i(a.program,"u_perturbedTexture",1),this.uniforms.set1i(a.program,"u_divergenceTexture",2),this.uniforms.set1f(a.program,"u_m1",this.config.m1),this.uniforms.set1f(a.program,"u_m2",this.config.m2),this.uniforms.set1f(a.program,"u_L1",this.config.L1),this.uniforms.set1f(a.program,"u_L2",this.config.L2),this.fb.attachColor(s.COLOR_ATTACHMENT0,this.stateAPair[e]),this.fb.attachColor(s.COLOR_ATTACHMENT1,this.perturbedAPair[e]),this.fb.attachColor(s.COLOR_ATTACHMENT2,this.dataPair[e]),s.drawBuffers([s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1,s.COLOR_ATTACHMENT2])),this.uniforms.set1f(a.program,"u_dt",this.config.dt),this.uniforms.set1i(a.program,"u_currentIter",this.frameCount),s.viewport(0,0,i,i),s.drawArrays(s.TRIANGLE_STRIP,0,4)}getDataTexture(){return this.dataPair[this.readIndex]}getFrameCount(){return this.frameCount}isComplete(){return this.isDivergenceComplete}dispose(){this.stopDivergence();const t=this.gl;for(const[,i]of this.programs)t.deleteProgram(i.program),t.deleteVertexArray(i.vao);this.programs.clear(),t.deleteFramebuffer(this.framebuffer);const e=[this.stateAPair,this.dataPair];this.stateBPair&&e.push(this.stateBPair),this.perturbedAPair&&e.push(this.perturbedAPair),this.perturbedBPair&&e.push(this.perturbedBPair);for(const i of e)t.deleteTexture(i[0]),t.deleteTexture(i[1])}}const at=`#version 300 es
precision highp float;

uniform sampler2D u_dataTexture;
uniform int u_colormap;
uniform int u_toneMapping;
uniform float u_maxValue;
uniform bool u_isDivergenceMode;

in vec2 v_uv;
out vec4 fragColor;

vec3 viridis(float t) {
    vec3 c0 = vec3(68.0/255.0, 1.0/255.0, 84.0/255.0);
    vec3 c1 = vec3(33.0/255.0, 145.0/255.0, 140.0/255.0);
    vec3 c2 = vec3(253.0/255.0, 231.0/255.0, 37.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 magma(float t) {
    vec3 c0 = vec3(4.0/255.0, 5.0/255.0, 9.0/255.0);
    vec3 c1 = vec3(148.0/255.0, 52.0/255.0, 110.0/255.0);
    vec3 c2 = vec3(252.0/255.0, 253.0/255.0, 191.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 plasma(float t) {
    vec3 c0 = vec3(13.0/255.0, 8.0/255.0, 135.0/255.0);
    vec3 c1 = vec3(156.0/255.0, 23.0/255.0, 158.0/255.0);
    vec3 c2 = vec3(240.0/255.0, 249.0/255.0, 33.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 inferno(float t) {
    vec3 c0 = vec3(0.0/255.0, 0.0/255.0, 4.0/255.0);
    vec3 c1 = vec3(187.0/255.0, 55.0/255.0, 84.0/255.0);
    vec3 c2 = vec3(252.0/255.0, 255.0/255.0, 164.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 turbo(float t) {
    float r = clamp((48.0 + 227.0 * sin((t - 0.5) * 3.14159265)) / 255.0, 0.0, 1.0);
    float g = clamp((t < 0.5 ? t * 400.0 : (1.0 - t) * 400.0) / 255.0, 0.0, 1.0);
    float b = clamp((128.0 + 127.0 * cos(t * 3.14159265)) / 255.0, 0.0, 1.0);
    return vec3(r, g, b);
}

vec3 jet(float t) {
    float r = clamp(t < 0.5 ? 0.0 : (t - 0.5) * 2.0, 0.0, 1.0);
    float g = clamp(t < 0.25 ? t * 4.0 : t < 0.75 ? 1.0 : (1.0 - t) * 4.0, 0.0, 1.0);
    float b = clamp(t < 0.5 ? (0.5 - t) * 2.0 : 0.0, 0.0, 1.0);
    return vec3(r, g, b);
}

vec3 rainbow(float t) {
    float hue = (1.0 - t) * 0.85;
    float s = 1.0, v = 1.0;
    float c = v * s;
    float x = c * (1.0 - abs(mod(hue * 6.0, 2.0) - 1.0));
    float m = v - c;
    vec3 rgb;
    if (hue < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (hue < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (hue < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (hue < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (hue < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}

vec3 applyColormap(float t, int mode) {
    if (mode == 0) return viridis(t);
    else if (mode == 1) return magma(t);
    else if (mode == 2) return plasma(t);
    else if (mode == 3) return inferno(t);
    else if (mode == 4) return turbo(t);
    else if (mode == 5) return jet(t);
    else return rainbow(t);
}

void main() {
    vec4 data = texture(u_dataTexture, v_uv);
    float value;
    
    if (u_isDivergenceMode) {
        value = data.r;
        if (value <= 0.0) {
            fragColor = vec4(1.0, 1.0, 1.0, 1.0);
            return;
        }
    } else {
        value = data.z;
        if (data.w < 0.5) {
            fragColor = vec4(0.1, 0.1, 0.1, 1.0);
            return;
        }
    }
    
    float t;
    if (u_toneMapping == 0) {
        t = value / u_maxValue;
    } else if (u_toneMapping == 1) {
        t = log(1.0 + value) / log(1.0 + u_maxValue);
    } else if (u_toneMapping == 2) {
        t = sqrt(value / u_maxValue);
    } else {
        float x = value / u_maxValue;
        t = x * x * (3.0 - 2.0 * x);
    }
    
    t = clamp(t, 0.0, 1.0);
    vec3 color = applyColormap(1.0 - t, u_colormap);
    fragColor = vec4(color, 1.0);
}
`;class rt{constructor(t,e,i,s,a){o(this,"maxValue",0);o(this,"program");o(this,"vao");this.gl=t,this.config=e,this.textures=i,this.uniforms=s;const n=new V(t).linkProgram(U,at,"render");this.vao=t.createVertexArray(),t.bindVertexArray(this.vao),t.bindBuffer(t.ARRAY_BUFFER,a);const l=t.getAttribLocation(n.program,"a_position");l>=0&&(t.enableVertexAttribArray(l),t.vertexAttribPointer(l,2,t.FLOAT,!1,0,0)),t.bindVertexArray(null),this.program=n.program}render(t){const e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.config.resolution,this.config.resolution),e.useProgram(this.program),e.bindVertexArray(this.vao),this.textures.bindTexture(0,t),this.uniforms.set1i(this.program,"u_dataTexture",0),this.uniforms.set1i(this.program,"u_colormap",this.config.colormap),this.uniforms.set1i(this.program,"u_toneMapping",this.config.toneMapping),this.uniforms.set1f(this.program,"u_maxValue",this.maxValue||1),this.uniforms.set1b(this.program,"u_isDivergenceMode",this.config.vizMode==="divergence"),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.bindVertexArray(null)}computeMaxValue(t){const e=this.gl,i=this.config.resolution,s=this.config.vizMode==="divergence",a=s?i:Math.min(128,i),r=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,r),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0);const n=new Float32Array(a*a*4);e.viewport(0,0,a,a),e.readPixels(0,0,a,a,e.RGBA,e.FLOAT,n);let l=0;const u=s?0:2;for(let c=0;c<n.length;c+=4){const m=n[c+u];m>l&&isFinite(m)&&(l=m)}this.maxValue=l,e.deleteFramebuffer(r),e.bindFramebuffer(e.FRAMEBUFFER,null)}getMaxValue(){return this.maxValue}}class L{constructor(t,e){o(this,"zoomHistory",[]);this.config=t,this.onZoomChange=e}get level(){return this.zoomHistory.length+1}applyRectangle(t,e,i,s,a,r){const n=Math.max(0,Math.min(1,Math.min(t,i)/a)),l=Math.max(0,Math.min(1,Math.max(t,i)/a)),u=Math.max(0,Math.min(1,1-Math.max(e,s)/r)),c=Math.max(0,Math.min(1,1-Math.min(e,s)/r)),m=this.config.phaseSpace.x.min+n*(this.config.phaseSpace.x.max-this.config.phaseSpace.x.min),h=this.config.phaseSpace.x.min+l*(this.config.phaseSpace.x.max-this.config.phaseSpace.x.min),f=this.config.phaseSpace.y.min+u*(this.config.phaseSpace.y.max-this.config.phaseSpace.y.min),g=this.config.phaseSpace.y.min+c*(this.config.phaseSpace.y.max-this.config.phaseSpace.y.min);this.zoomHistory.push({x:{...this.config.phaseSpace.x},y:{...this.config.phaseSpace.y}}),this.config.phaseSpace.x={dimension:this.config.phaseSpace.x.dimension,min:Math.min(m,h),max:Math.max(m,h)},this.config.phaseSpace.y={dimension:this.config.phaseSpace.y.dimension,min:Math.min(f,g),max:Math.max(f,g)},this.onZoomChange()}zoomOut(){if(this.zoomHistory.length>0){const t=this.zoomHistory.pop();this.config.phaseSpace.x=t.x,this.config.phaseSpace.y=t.y}else this.config.phaseSpace.x.min=-Math.PI,this.config.phaseSpace.x.max=Math.PI,this.config.phaseSpace.y.min=-Math.PI,this.config.phaseSpace.y.max=Math.PI;this.onZoomChange()}reset(){this.zoomHistory=[],this.config.phaseSpace.x.min=-Math.PI,this.config.phaseSpace.x.max=Math.PI,this.config.phaseSpace.y.min=-Math.PI,this.config.phaseSpace.y.max=Math.PI,this.onZoomChange()}}class nt{constructor(){o(this,"elements",{});this.cacheElements()}cacheElements(){const t=["systemType","vizMode","resolution","colormap","toneMapping","xDimension","yDimension","xMin","xMax","yMin","yMax","initAngle1","initVelocity1","initAngle2","initVelocity2","initStretch1","initStretchRate1","initStretch2","initStretchRate2","dt","iterations","maxIter","perturb","resetBtn","downloadBtn","zoomOutBtn","modeIndicator","subtitle","legendGradient","frameCount","maxDistance","fps","zoomLevel","iterValue","perturbValue","m1Value","m2Value","L1Value","L2Value","k1Value","k2Value","elasticControls","maxIterControl","perturbControl","frameRow","maxDistRow"];for(const e of t){const i=document.getElementById(e);i&&(this.elements[e]=i)}}getElement(t){return this.elements[t]??document.getElementById(t)}getInputValue(t){const e=this.getElement(t);return e instanceof HTMLInputElement||e instanceof HTMLSelectElement?e.value:""}setInputValue(t,e){const i=this.getElement(t);(i instanceof HTMLInputElement||i instanceof HTMLSelectElement)&&(i.value=String(e))}setTextContent(t,e){const i=this.getElement(t);i&&(i.textContent=e)}setDisplay(t,e){const i=this.getElement(t);i&&(i.style.display=e)}updateModeUI(t){t.vizMode;const e=t.system!=="rigid",i=t.vizMode==="divergence";this.setDisplay("maxIterControl",i?"block":"none"),this.setDisplay("perturbControl",i?"block":"none"),this.setDisplay("elasticControls",e?"block":"none");const s=document.querySelectorAll(".elastic-only"),a=document.querySelectorAll(".elastic-initial");for(let n=0;n<s.length;n++)s[n].style.display=e?"block":"none";for(let n=0;n<a.length;n++)a[n].style.display=e?"block":"none";this.setTextContent("modeIndicator",`${J[t.system]} · ${tt[t.vizMode]}`);const r={distance:e?"Total distance traveled by bob2 (elastic system)":"Total distance traveled by the second pendulum bob",divergence:"Iterations until perturbed trajectory diverges"};this.setTextContent("subtitle",r[t.vizMode]),this.setDisplay("frameRow",i?"none":"inline"),this.setDisplay("maxDistRow",i?"none":"inline"),this.ensureDistinctDimensions(t.phaseSpace.x.dimension,t.phaseSpace.y.dimension)}updateLegend(t){const e=this.getElement("legendGradient");e&&(e.style.background=t===6?"linear-gradient(90deg, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%))":"linear-gradient(90deg, rgb(68, 1, 84), rgb(33, 145, 140), rgb(253, 231, 37))")}updatePhaseSpaceInputs(t){this.setInputValue("xDimension",t.phaseSpace.x.dimension),this.setInputValue("xMin",t.phaseSpace.x.min.toFixed(2)),this.setInputValue("xMax",t.phaseSpace.x.max.toFixed(2)),this.setInputValue("yDimension",t.phaseSpace.y.dimension),this.setInputValue("yMin",t.phaseSpace.y.min.toFixed(2)),this.setInputValue("yMax",t.phaseSpace.y.max.toFixed(2));const e=t.phaseSpace.initialValues;this.setInputValue("initAngle1",e.angle1.toFixed(2)),this.setInputValue("initVelocity1",e.velocity1.toFixed(2)),this.setInputValue("initAngle2",e.angle2.toFixed(2)),this.setInputValue("initVelocity2",e.velocity2.toFixed(2)),this.setInputValue("initStretch1",e.stretch1.toFixed(2)),this.setInputValue("initStretchRate1",e.stretchRate1.toFixed(2)),this.setInputValue("initStretch2",e.stretch2.toFixed(2)),this.setInputValue("initStretchRate2",e.stretchRate2.toFixed(2))}updatePendulumParams(t){this.setInputValue("m1",t.m1),this.setTextContent("m1Value",t.m1.toFixed(1)),this.setInputValue("m2",t.m2),this.setTextContent("m2Value",t.m2.toFixed(1)),this.setInputValue("L1",t.L1),this.setTextContent("L1Value",t.L1.toFixed(1)),this.setInputValue("L2",t.L2),this.setTextContent("L2Value",t.L2.toFixed(1)),this.setInputValue("k1",t.k1),this.setTextContent("k1Value",String(t.k1)),this.setInputValue("k2",t.k2),this.setTextContent("k2Value",String(t.k2))}updateIntegrationInputs(t){this.setInputValue("dt",t.dt.toFixed(4)),this.setInputValue("iterations",t.iterationsPerFrame),this.setTextContent("iterValue",String(t.iterationsPerFrame)),this.setInputValue("maxIter",t.maxIter),this.setInputValue("perturb",t.perturb),this.setTextContent("perturbValue",t.perturb.toFixed(6))}updateStats(t,e,i,s){this.setTextContent("frameCount",String(t)),this.setTextContent("maxDistance",e.toFixed(2)),this.setTextContent("fps",String(i)),this.setTextContent("zoomLevel",String(s))}ensureDistinctDimensions(t,e){const i=this.getElement("xDimension"),s=this.getElement("yDimension");if(!(!i||!s)){for(let a=0;a<i.options.length;a++){const r=i.options[a];r.disabled=r.value===e}for(let a=0;a<s.options.length;a++){const r=s.options[a];r.disabled=r.value===t}}}bindControl(t,e,i="input"){const s=this.getElement(t);s&&(i==="input"&&(s instanceof HTMLInputElement||s instanceof HTMLSelectElement)?s.addEventListener("input",()=>e(s.value)):s.addEventListener("change",()=>e(this.getInputValue(t))))}bindButton(t,e){const i=this.getElement(t);i&&i.addEventListener("click",e)}}class ot{constructor(){o(this,"lastTime",performance.now());o(this,"fps",0)}update(t,e,i,s){const a=performance.now();t.vizMode==="divergence"&&s?this.fps=0:this.fps=Math.round(1e3/(a-this.lastTime)),this.lastTime=a}getFps(){return this.fps}}function N(d){const t=d.length;if(t<=1)return[{re:d[0]||0,im:0}];if(t%2!==0)throw new Error("FFT length must be power of 2");const e=new Float64Array(t/2),i=new Float64Array(t/2);for(let n=0;n<t/2;n++)e[n]=d[2*n],i[n]=d[2*n+1];const s=N(e),a=N(i),r=new Array(t);for(let n=0;n<t/2;n++){const l=-2*Math.PI*n/t,u={re:Math.cos(l)*a[n].re-Math.sin(l)*a[n].im,im:Math.cos(l)*a[n].im+Math.sin(l)*a[n].re};r[n]={re:s[n].re+u.re,im:s[n].im+u.im},r[n+t/2]={re:s[n].re-u.re,im:s[n].im-u.im}}return r}function lt(d){const t=d.length,e=Math.floor(t/2)+1,i=new Float64Array(e);for(let s=0;s<e;s++)i[s]=Math.sqrt(d[s].re*d[s].re+d[s].im*d[s].im);return i}function ut(d){return Math.pow(2,Math.ceil(Math.log2(d)))}function ct(d){const t=ut(d.length);if(t===d.length)return d;const e=new Float64Array(t);return e.set(d),e}function ht(d){const t=d.length,e=new Float64Array(t);for(let i=0;i<t;i++){const s=.5*(1-Math.cos(2*Math.PI*i/(t-1)));e[i]=d[i]*s}return e}class ft{constructor(t,e,i){o(this,"t1History");o(this,"w1History");o(this,"t2History");o(this,"w2History");o(this,"writeIdx",0);o(this,"filled",!1);o(this,"sampleRate");this.maxSamples=t,this.t1History=new Float64Array(t),this.w1History=new Float64Array(t),this.t2History=new Float64Array(t),this.w2History=new Float64Array(t),this.sampleRate=1/(e*i)}reset(){this.writeIdx=0,this.filled=!1}addSample(t,e,i,s){this.t1History[this.writeIdx]=t,this.w1History[this.writeIdx]=e,this.t2History[this.writeIdx]=i,this.w2History[this.writeIdx]=s,this.writeIdx++,this.writeIdx>=this.maxSamples&&(this.writeIdx=0,this.filled=!0)}analyze(){const t=this.filled?this.maxSamples:this.writeIdx;if(t<256)return{isPeriodic:!1,period:null,confidence:0,dominantFreq:null};const e=this.filled?this.t1History:this.t1History.subarray(0,t),i=this.filled?this.w1History:this.w1History.subarray(0,t),s=this.filled?this.t2History:this.t2History.subarray(0,t),a=this.filled?this.w2History:this.w2History.subarray(0,t),r=[this.analyzeDimension(e,"theta1"),this.analyzeDimension(i,"omega1"),this.analyzeDimension(s,"theta2"),this.analyzeDimension(a,"omega2")],n=r.reduce((h,f)=>h.confidence>f.confidence?h:f),l=r.filter(h=>h.isPeriodic).length,u=r.reduce((h,f)=>h+f.confidence,0)/r.length,c=n.confidence>.3&&(l>=2||n.confidence>.6),m=Math.min(1,n.confidence*.7+u*.3);return{isPeriodic:c,period:c?n.period:null,confidence:m,dominantFreq:c?n.dominantFreq:null}}analyzeDimension(t,e){const i=t.reduce((b,_)=>b+_,0)/t.length,s=new Float64Array(t.length);for(let b=0;b<t.length;b++)s[b]=t[b]-i;const a=ht(s),r=ct(a),n=lt(N(r)),l=n.length,u=this.findSpectrumPeaks(n,l);if(u.length===0)return{isPeriodic:!1,period:null,confidence:0,dominantFreq:null};const c=u[0],m=this.sampleRate/r.length,h=c.bin*m,f=h>0?1/h:null,g=n.reduce((b,_)=>b+_*_,0),v=c.height*c.height,x=g>0?v/g:0,M=Math.min(1,x*3+c.prominence*.5);return{isPeriodic:M>.25&&c.prominence>.3,period:f,confidence:M,dominantFreq:h}}findSpectrumPeaks(t,e){const i=[],a=e-1;for(let r=2;r<a;r++)if(t[r]>t[r-1]&&t[r]>t[r+1]){const l=Math.min(...Array.from({length:5},(h,f)=>t[Math.max(0,r-f-1)])),u=Math.min(...Array.from({length:5},(h,f)=>t[Math.min(e-1,r+f+1)])),c=Math.max(l,u),m=t[r]-c;m>0&&i.push({bin:r,height:t[r],prominence:m/t[r]})}return i.sort((r,n)=>n.height-r.height),i.slice(0,3)}}class dt{constructor(t,e,i=1e3){o(this,"canvas");o(this,"ctx");o(this,"poincareCanvas");o(this,"poincareCtx");o(this,"data");o(this,"maxPoints");o(this,"width");o(this,"height");o(this,"phaseSpaceHistory",[]);o(this,"poincarePoints",[]);o(this,"kineticEnergyHistory",[]);o(this,"keThreshold",null);o(this,"lastKeState",null);o(this,"framesSinceReset",0);o(this,"ANALYSIS_FRAMES",300);o(this,"hasAnalyzed",!1);o(this,"colors",{theta1:"rgba(100, 200, 255, 0.85)",theta2:"rgba(255, 150, 100, 0.85)",omega1:"rgba(150, 255, 150, 0.85)",omega2:"rgba(255, 255, 100, 0.85)",kineticEnergy:"rgba(255, 100, 100, 0.85)",potentialEnergy:"rgba(100, 100, 255, 0.85)",elasticEnergy:"rgba(255, 200, 100, 0.85)"});o(this,"labels",{theta1:"θ₁",theta2:"θ₂",omega1:"ω₁",omega2:"ω₂",kineticEnergy:"KE",potentialEnergy:"PE",elasticEnergy:"EE"});this.canvas=t,this.ctx=t.getContext("2d"),this.poincareCanvas=e,this.poincareCtx=e.getContext("2d"),this.maxPoints=i,this.width=t.width,this.height=t.height,this.data={theta1:[],omega1:[],theta2:[],omega2:[],kineticEnergy:[],potentialEnergy:[],elasticEnergy:[]}}reset(){this.data={theta1:[],omega1:[],theta2:[],omega2:[],kineticEnergy:[],potentialEnergy:[],elasticEnergy:[]},this.phaseSpaceHistory=[],this.poincarePoints=[],this.kineticEnergyHistory=[],this.keThreshold=null,this.lastKeState=null,this.framesSinceReset=0,this.hasAnalyzed=!1}addPoint(t,e,i,s,a,r,n){this.data.theta1.push(t),this.data.omega1.push(e),this.data.theta2.push(i),this.data.omega2.push(s),this.data.kineticEnergy.push(a),this.data.potentialEnergy.push(r),this.data.elasticEnergy.push(n),this.phaseSpaceHistory.push([t,e,i,s]),this.kineticEnergyHistory.push(a),this.data.theta1.length>this.maxPoints&&(this.data.theta1.shift(),this.data.omega1.shift(),this.data.theta2.shift(),this.data.omega2.shift(),this.data.kineticEnergy.shift(),this.data.potentialEnergy.shift(),this.data.elasticEnergy.shift()),this.phaseSpaceHistory.length>1e4&&(this.phaseSpaceHistory.shift(),this.kineticEnergyHistory.shift()),this.framesSinceReset++,!this.hasAnalyzed&&this.framesSinceReset>=this.ANALYSIS_FRAMES&&this.analyzeKineticEnergy(),this.keThreshold!==null&&this.checkPoincareCrossing()}analyzeKineticEnergy(){if(this.kineticEnergyHistory.length===0)return;const t=this.kineticEnergyHistory.slice(-this.ANALYSIS_FRAMES),e=t.reduce((s,a)=>s+a,0)/t.length;this.keThreshold=e,this.hasAnalyzed=!0;const i=this.kineticEnergyHistory[this.kineticEnergyHistory.length-1];this.lastKeState=i>=e?"above":"below",this.poincarePoints=[];for(let s=1;s<this.kineticEnergyHistory.length;s++){const a=this.kineticEnergyHistory[s-1],r=this.kineticEnergyHistory[s],n=a>=e?"above":"below",l=r>=e?"above":"below";if(n!==l){const u=Math.abs(a-e)/Math.abs(r-a),c=this.phaseSpaceHistory[s-1],m=this.phaseSpaceHistory[s],h=c.map((f,g)=>f+u*(m[g]-f));this.poincarePoints.push({x:h[0],y:h[1]})}}}checkPoincareCrossing(){if(this.keThreshold===null||this.kineticEnergyHistory.length<2)return;const t=this.kineticEnergyHistory.length,e=this.kineticEnergyHistory[t-2],i=this.kineticEnergyHistory[t-1],s=e>=this.keThreshold?"above":"below",a=i>=this.keThreshold?"above":"below";if(s!==a){const r=Math.abs(e-this.keThreshold)/Math.abs(i-e),n=this.phaseSpaceHistory[t-2],l=this.phaseSpaceHistory[t-1],u=n.map((c,m)=>c+r*(l[m]-c));this.poincarePoints.push({x:u[0],y:u[1]})}this.lastKeState=a}draw(t){const e=this.ctx,i=this.width,s=this.height;e.clearRect(0,0,i,s),e.fillStyle="rgba(8, 10, 16, 0.95)",e.fillRect(0,0,i,s);const a=this.data.theta1.length;if(a<2)return;const r=[this.data.theta1,this.data.omega1,this.data.theta2,this.data.omega2,this.data.kineticEnergy,this.data.potentialEnergy],n=[this.colors.theta1,this.colors.omega1,this.colors.theta2,this.colors.omega2,this.colors.kineticEnergy,this.colors.potentialEnergy],l=[this.labels.theta1,this.labels.omega1,this.labels.theta2,this.labels.omega2,this.labels.kineticEnergy,this.labels.potentialEnergy];t&&(r.push(this.data.elasticEnergy),n.push(this.colors.elasticEnergy),l.push(this.labels.elasticEnergy));const u=this.getScaleRange(r);e.strokeStyle="rgba(100, 100, 100, 0.1)",e.lineWidth=.5;for(let h=0;h<=4;h++){const f=s/4*h;e.beginPath(),e.moveTo(0,f),e.lineTo(i,f),e.stroke()}this.drawLineGroup(r,n,u,0,s,a),e.font="500 10px monospace",e.textAlign="left";let c=4;const m=12;for(let h=0;h<r.length;h++){const f=n[h],g=l[h],v=r[h][a-1];e.fillStyle=f,e.fillText(`${g} ${(v==null?void 0:v.toFixed(2))??""}`,c,m);const x=e.measureText(`${g} ${(v==null?void 0:v.toFixed(2))??""}`).width;c+=x+12}this.poincarePoints.length>0&&(e.fillStyle="rgba(255, 255, 255, 0.5)",e.fillText(`Poincaré: ${this.poincarePoints.length}`,c,m)),e.textAlign="right",e.fillStyle="rgba(150, 150, 150, 0.6)",e.font="500 8px monospace",e.fillText(u.max.toFixed(1),i-4,10),e.fillText(u.min.toFixed(1),i-4,s-2)}drawPoincare(){var h;const t=this.poincareCtx,e=this.poincareCanvas.width,i=this.poincareCanvas.height;if(t.clearRect(0,0,e,i),t.fillStyle="rgba(8, 10, 16, 0.95)",t.fillRect(0,0,e,i),!this.hasAnalyzed){t.fillStyle="rgba(150, 150, 150, 0.5)",t.font="500 12px monospace",t.textAlign="center",t.fillText("Collecting data for Poincaré section...",e/2,i/2);return}if(this.poincarePoints.length===0){t.fillStyle="rgba(150, 150, 150, 0.5)",t.font="500 12px monospace",t.textAlign="center",t.fillText("No Poincaré crossings yet...",e/2,i/2);return}let s=1/0,a=-1/0,r=1/0,n=-1/0;for(const f of this.poincarePoints)f.x<s&&(s=f.x),f.x>a&&(a=f.x),f.y<r&&(r=f.y),f.y>n&&(n=f.y);const l=(a-s)*.1||1,u=(n-r)*.1||1;s-=l,a+=l,r-=u,n+=u;const c=a-s,m=n-r;if(!(c===0||m===0)){t.strokeStyle="rgba(100, 100, 100, 0.3)",t.lineWidth=.5,t.beginPath(),t.moveTo(0,i/2),t.lineTo(e,i/2),t.stroke(),t.beginPath(),t.moveTo(e/2,0),t.lineTo(e/2,i),t.stroke();for(const f of this.poincarePoints){const g=(f.x-s)/c*e,v=i-(f.y-r)/m*i;t.beginPath(),t.arc(g,v,3,0,Math.PI*2),t.fillStyle="rgba(255, 200, 100, 0.8)",t.fill()}t.fillStyle="rgba(255, 255, 255, 0.5)",t.font="500 10px monospace",t.textAlign="left",t.fillText(`Poincaré Section: KE = ${(h=this.keThreshold)==null?void 0:h.toFixed(2)} (${this.poincarePoints.length} points)`,10,20)}}getScaleRange(t){let e=1/0,i=-1/0;for(const r of t)for(const n of r)!isNaN(n)&&isFinite(n)&&(n<e&&(e=n),n>i&&(i=n));if(e===1/0)return{min:-1,max:1};const s=i-e,a=s===0?1:s*.1;return{min:e-a,max:i+a}}drawLineGroup(t,e,i,s,a,r){const n=this.ctx,l=this.width,u=i.max-i.min;if(!(u===0||!isFinite(u)))for(let c=0;c<t.length;c++){const m=t[c],h=e[c];n.beginPath(),n.strokeStyle=h,n.lineWidth=1.5;let f=!1;for(let g=0;g<r;g++){const v=m[g];if(!isFinite(v))continue;const x=g/(r-1)*l,M=(v-i.min)/u,T=s+a-M*a;f?n.lineTo(x,T):(n.moveTo(x,T),f=!0)}f&&n.stroke()}}resize(t,e){this.canvas.width=t,this.canvas.height=e,this.width=t,this.height=e}}const I={angle1:0,velocity1:1,stretch1:2,stretchRate1:3,angle2:4,velocity2:5,stretch2:6,stretchRate2:7};class mt{constructor(t,e,i,s){o(this,"gl");o(this,"ctx");o(this,"graphCtx");o(this,"poincareCtx");o(this,"drawCanvas");o(this,"graphCanvas");o(this,"poincareCanvas");o(this,"config");o(this,"systemKey");o(this,"quadBuf");o(this,"fb");o(this,"baseAPair");o(this,"baseBPair",null);o(this,"pertAPair");o(this,"pertBPair",null);o(this,"initProg");o(this,"physicsProg");o(this,"readIdx",0);o(this,"trail",[]);o(this,"diverged",!1);o(this,"active",!1);o(this,"simulating",!1);o(this,"animId",null);o(this,"debounceTimer",null);o(this,"baseSA",new Float32Array(4));o(this,"baseSB",null);o(this,"pertSA",new Float32Array(4));o(this,"pertSB",null);o(this,"boxMargin",0);o(this,"boxSize",500);o(this,"armScale",110);o(this,"freqAnalyzer");o(this,"lastAnalysis",null);o(this,"analysisFrameSkip",0);o(this,"phaseSpaceGraph");o(this,"previewEnabled",!1);o(this,"previewBtn");o(this,"previewStatus");this.mainCanvas=e,this.config=s,this.systemKey=s.system==="rigid"?"rigid":s.system==="nonlinear"?"nonlinear":"elastic",this.gl=i,this.drawCanvas=document.getElementById("previewCanvas"),this.ctx=this.drawCanvas.getContext("2d"),this.graphCanvas=document.getElementById("graphCanvas"),this.graphCtx=this.graphCanvas.getContext("2d"),this.poincareCanvas=document.getElementById("poincareCanvas"),this.poincareCtx=this.poincareCanvas.getContext("2d"),this.phaseSpaceGraph=new dt(this.graphCanvas,this.poincareCanvas,1e3),this.syncSize(),this.previewBtn=document.getElementById("previewToggleBtn"),this.previewStatus=document.getElementById("previewStatus"),this.previewBtn.addEventListener("click",()=>this.togglePreview()),this.quadBuf=i.createBuffer(),i.bindBuffer(i.ARRAY_BUFFER,this.quadBuf),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),i.STATIC_DRAW),this.fb=i.createFramebuffer(),this.baseAPair=this.makePair(),this.pertAPair=this.makePair(),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&(this.baseBPair=this.makePair(),this.pertBPair=this.makePair(),this.baseSB=new Float32Array(4),this.pertSB=new Float32Array(4)),this.initProg=this.buildProg(P.buildPreviewInit(this.systemKey)),this.physicsProg=this.buildProg(P.buildPreviewPhysicsLoop(this.systemKey)),this.freqAnalyzer=new ft(2048,this.config.dt,15),this.mainCanvas.addEventListener("click",a=>{if(this.previewEnabled){const r=this.mainCanvas.getBoundingClientRect(),n=(a.clientX-r.left)*(this.mainCanvas.width/r.width),l=(a.clientY-r.top)*(this.mainCanvas.height/r.height);this.onClick(n,l)}}),new ResizeObserver(()=>this.syncSize()).observe(t)}syncSize(){const t=this.boxSize+2*this.boxMargin;this.drawCanvas.width=t,this.drawCanvas.height=500,this.graphCanvas.width=t,this.graphCanvas.height=200,this.phaseSpaceGraph.resize(t,200)}togglePreview(){this.previewEnabled=!this.previewEnabled,this.previewEnabled?(this.previewBtn.textContent="✕ Stop",this.previewBtn.style.background="#3a2020",this.previewStatus.textContent="Click on the main canvas to start simulation",this.previewStatus.style.color="#888"):(this.previewBtn.textContent="▶ Start",this.previewBtn.style.background="",this.previewStatus.textContent='Click "Start" then click on the main canvas',this.previewStatus.style.color="#666",this.onLeave())}makeTex(){const t=this.gl,e=t.createTexture();return t.bindTexture(t.TEXTURE_2D,e),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,1,1,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),e}makePair(){return[this.makeTex(),this.makeTex()]}buildProg(t){const i=new V(this.gl).linkProgram(U,t,"p"),s=this.gl.createVertexArray();this.gl.bindVertexArray(s),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.quadBuf);const a=this.gl.getAttribLocation(i.program,"a_position");return a>=0&&(this.gl.enableVertexAttribArray(a),this.gl.vertexAttribPointer(a,2,this.gl.FLOAT,!1,0,0)),this.gl.bindVertexArray(null),{program:i.program,vao:s}}use(t){return this.gl.useProgram(t.program),this.gl.bindVertexArray(t.vao),t.program}u(t,e){const i=this.gl.getUniformLocation(t,e);if(!i)throw new Error(`uniform not found: ${e}`);return i}bind(t,e){this.gl.activeTexture(this.gl.TEXTURE0+t),this.gl.bindTexture(this.gl.TEXTURE_2D,e)}readTex(t,e){const i=this.gl;i.bindFramebuffer(i.FRAMEBUFFER,this.fb),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,t,0);for(let s=1;s<5;s++)i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+s,i.TEXTURE_2D,null,0);i.drawBuffers([i.COLOR_ATTACHMENT0]),i.readBuffer(i.COLOR_ATTACHMENT0),i.readPixels(0,0,1,1,i.RGBA,i.FLOAT,e),i.bindFramebuffer(i.FRAMEBUFFER,null)}setDragging(t){t&&this.onLeave()}onClick(t,e){const i=t/this.mainCanvas.width,s=1-e/this.mainCanvas.height,a=this.config.phaseSpace.x.min+i*(this.config.phaseSpace.x.max-this.config.phaseSpace.x.min),r=this.config.phaseSpace.y.min+s*(this.config.phaseSpace.y.max-this.config.phaseSpace.y.min);this.active=!0,this.simulating=!1,this.stopAnim(),this.trail=[],this.diverged=!1,this.readIdx=0,this.freqAnalyzer.reset(),this.lastAnalysis=null,this.analysisFrameSkip=0,this.phaseSpaceGraph.reset(),this.gpuInit(a,r),this.readStates(),this.trail.push(this.bob2(this.baseSA,this.baseSB)),this.drawFrame(),this.previewStatus.textContent="Simulating...",this.previewStatus.style.color="#0d4",clearTimeout(this.debounceTimer??void 0),this.debounceTimer=window.setTimeout(()=>{this.simulating=!0,this.loop()},100)}onLeave(){this.active=!1,this.simulating=!1,this.stopAnim(),clearTimeout(this.debounceTimer??void 0),this.ctx.clearRect(0,0,this.drawCanvas.width,this.drawCanvas.height),this.graphCtx.clearRect(0,0,this.graphCanvas.width,this.graphCanvas.height),this.previewEnabled&&(this.previewStatus.textContent="Click on the main canvas to start simulation",this.previewStatus.style.color="#888")}stopAnim(){this.animId!==null&&(cancelAnimationFrame(this.animId),this.animId=null)}gpuInit(t,e){const i=this.gl,s=this.use(this.initProg),a=this.config.phaseSpace.initialValues;if(this.systemKey==="rigid"){const r=[a.angle1,a.velocity1,a.angle2,a.velocity2],n=I[this.config.phaseSpace.x.dimension],l=I[this.config.phaseSpace.y.dimension],u=h=>h===0?0:h===1?1:h===4?2:h===5?3:-1,c=u(n),m=u(l);c>=0&&(r[c]+=t),m>=0&&(r[m]+=e),i.uniform4f(this.u(s,"u_initialState"),r[0],r[1],r[2],r[3])}else{const r=[a.angle1,a.velocity1,a.stretch1,a.stretchRate1],n=[a.angle2,a.velocity2,a.stretch2,a.stretchRate2],l=I[this.config.phaseSpace.x.dimension],u=I[this.config.phaseSpace.y.dimension];l<4?r[l]+=t:n[l-4]+=t,u<4?r[u]+=e:n[u-4]+=e,i.uniform4f(this.u(s,"u_initialA"),r[0],r[1],r[2],r[3]),i.uniform4f(this.u(s,"u_initialB"),n[0],n[1],n[2],n[3])}i.uniform1f(this.u(s,"u_perturb"),this.config.perturb),i.bindFramebuffer(i.FRAMEBUFFER,this.fb);for(let r=0;r<5;r++)i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+r,i.TEXTURE_2D,null,0);this.systemKey==="elastic"||this.systemKey==="nonlinear"?(i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,this.baseAPair[0],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT1,i.TEXTURE_2D,this.baseBPair[0],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT2,i.TEXTURE_2D,this.pertAPair[0],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT3,i.TEXTURE_2D,this.pertBPair[0],0),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1,i.COLOR_ATTACHMENT2,i.COLOR_ATTACHMENT3])):(i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,this.baseAPair[0],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT1,i.TEXTURE_2D,this.pertAPair[0],0),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1])),i.viewport(0,0,1,1),i.drawArrays(i.TRIANGLE_STRIP,0,4),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindVertexArray(null)}gpuStep(t,e){const i=this.gl,s=this.readIdx,a=1-s,r=this.use(this.physicsProg);i.uniform1f(this.u(r,"u_dt"),this.config.dt),i.uniform1i(this.u(r,"u_steps"),15),i.bindFramebuffer(i.FRAMEBUFFER,this.fb);for(let n=0;n<5;n++)i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+n,i.TEXTURE_2D,null,0);this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.bind(0,t[s]),this.bind(1,e[s]),i.uniform1i(this.u(r,"u_stateTextureA"),0),i.uniform1i(this.u(r,"u_stateTextureB"),1),i.uniform1f(this.u(r,"u_k1"),this.config.k1),i.uniform1f(this.u(r,"u_k2"),this.config.k2),i.uniform1f(this.u(r,"u_m1"),this.config.m1),i.uniform1f(this.u(r,"u_m2"),this.config.m2),i.uniform1f(this.u(r,"u_L1"),this.config.L1),i.uniform1f(this.u(r,"u_L2"),this.config.L2),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,t[a],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT1,i.TEXTURE_2D,e[a],0),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1])):(this.bind(0,t[s]),i.uniform1i(this.u(r,"u_stateTexture"),0),i.uniform1f(this.u(r,"u_m1"),this.config.m1),i.uniform1f(this.u(r,"u_m2"),this.config.m2),i.uniform1f(this.u(r,"u_L1"),this.config.L1),i.uniform1f(this.u(r,"u_L2"),this.config.L2),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,t[a],0),i.drawBuffers([i.COLOR_ATTACHMENT0])),i.viewport(0,0,1,1),i.drawArrays(i.TRIANGLE_STRIP,0,4),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindVertexArray(null)}readStates(){const t=this.readIdx;this.readTex(this.baseAPair[t],this.baseSA),this.readTex(this.pertAPair[t],this.pertSA),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&(this.readTex(this.baseBPair[t],this.baseSB),this.readTex(this.pertBPair[t],this.pertSB))}decodeAngles(t,e){return this.systemKey==="rigid"?{t1:t[0],t2:t[2],l1:this.config.L1,l2:this.config.L2}:{t1:t[0],t2:e[0],l1:this.config.L1+t[2],l2:this.config.L2+e[2]}}bob2(t,e){const{t1:i,t2:s,l1:a,l2:r}=this.decodeAngles(t,e),n=a*Math.sin(i),l=-a*Math.cos(i);return{x:n+r*Math.sin(s),y:l-r*Math.cos(s)}}calculateEnergies(t,e){const{t1:i,t2:s,l1:a,l2:r}=this.decodeAngles(t,e),n=t[1],l=this.systemKey==="rigid"?t[3]:e[1],u=-a*Math.cos(i),c=u-r*Math.cos(s),m=a*n*Math.cos(i),h=a*n*Math.sin(i),f=m+r*l*Math.cos(s),g=h+r*l*Math.sin(s),v=.5*this.config.m1*(m*m+h*h)+.5*this.config.m2*(f*f+g*g),x=9.81,M=this.config.m1*x*u+this.config.m2*x*c;let T=0;if(this.systemKey==="elastic"||this.systemKey==="nonlinear"){const b=t[2],_=e[2];if(this.systemKey==="nonlinear"){const A=this.config.L1,D=this.config.L2,B=Math.abs(b),R=Math.abs(_),E=this.config.k1*A*(Math.exp(B/A)-1-B/A),C=this.config.k2*D*(Math.exp(R/D)-1-R/D);T=E+C}else T=.5*this.config.k1*b*b+.5*this.config.k2*_*_}return{ke:v,pe:M,ee:T}}checkDivergence(){const t=Math.PI,e=(r,n)=>{const l=r-n;return l-2*t*Math.floor(l/(2*t)+.5)},i=this.baseSA,s=this.pertSA;let a=e(i[0],s[0])**2+(i[1]-s[1])**2;if(this.systemKey==="rigid")a+=e(i[2],s[2])**2+(i[3]-s[3])**2;else{const r=this.baseSB,n=this.pertSB;a+=e(r[0],n[0])**2+(r[1]-n[1])**2+(i[2]-s[2])**2+(i[3]-s[3])**2+(r[2]-n[2])**2+(r[3]-n[3])**2}return Math.sqrt(a)>.05}loop(){if(!this.active||!this.simulating)return;const t=1-this.readIdx;this.gpuStep(this.baseAPair,this.baseBPair),this.gpuStep(this.pertAPair,this.pertBPair),this.readIdx=t,this.readStates(),!this.diverged&&this.checkDivergence()&&(this.diverged=!0);const e=l=>{const u=Math.PI;return l-2*u*Math.floor((l+u)/(2*u))},i=e(this.baseSA[0]),s=this.baseSA[1],a=e(this.systemKey==="rigid"?this.baseSA[2]:this.baseSB[0]),r=this.systemKey==="rigid"?this.baseSA[3]:this.baseSB[1],n=this.calculateEnergies(this.baseSA,this.baseSB);if(this.phaseSpaceGraph.addPoint(i,s,a,r,n.ke,n.pe,n.ee),!this.diverged){const l=this.bob2(this.baseSA,this.baseSB);this.trail.push(l)}this.drawFrame(),this.animId=requestAnimationFrame(()=>this.loop())}drawFrame(){const t=this.ctx,e=this.drawCanvas.width,i=this.drawCanvas.height;if(t.clearRect(0,0,e,i),!this.active)return;const s=this.boxSize,a=(this.trail.length>0?Math.max(...this.trail.map(y=>Math.max(Math.abs(y.x),Math.abs(y.y)))):2)*1.15,r=Math.min(this.armScale,(s/2-20)/a),n=s/2,l=i/2,u=(y,w)=>({px:n+y*r,py:l-w*r});if(t.save(),t.fillStyle=this.diverged?"rgba(40, 20, 8, 0.88)":"rgba(8, 10, 16, 0.88)",t.fillRect(0,0,e,i),this.trail.length>1){t.beginPath();for(let y=0;y<this.trail.length;y++){const w=u(this.trail[y].x,this.trail[y].y);y===0?t.moveTo(w.px,w.py):t.lineTo(w.px,w.py)}t.strokeStyle=this.diverged?"rgba(0, 212, 170, 0.5)":"rgba(0, 212, 170, 0.7)",t.lineWidth=1.5,t.stroke(),this.diverged||(t.shadowColor="rgba(0, 212, 170, 0.4)",t.shadowBlur=6,t.strokeStyle="rgba(0, 212, 170, 0.3)",t.lineWidth=1,t.stroke(),t.shadowBlur=0)}const c=this.decodeAngles(this.baseSA,this.baseSB),m=this.decodeAngles(this.pertSA,this.pertSB),h=c.l1*Math.sin(c.t1),f=-c.l1*Math.cos(c.t1),g=h+c.l2*Math.sin(c.t2),v=f-c.l2*Math.cos(c.t2),x=m.l1*Math.sin(m.t1),M=-m.l1*Math.cos(m.t1),T=x+m.l2*Math.sin(m.t2),b=M-m.l2*Math.cos(m.t2),_=u(0,0),A=u(x,M),D=u(T,b);t.beginPath(),t.moveTo(_.px,_.py),t.lineTo(A.px,A.py),t.lineTo(D.px,D.py),t.strokeStyle="rgba(232, 160, 48, 0.35)",t.lineWidth=1.5,t.stroke();const B=2+this.config.m1*2,R=2.5+this.config.m2*2.5;t.beginPath(),t.arc(A.px,A.py,B*.7,0,Math.PI*2),t.fillStyle="rgba(232, 160, 48, 0.3)",t.fill(),t.beginPath(),t.arc(D.px,D.py,R*.7,0,Math.PI*2),t.fillStyle="rgba(232, 160, 48, 0.4)",t.fill();const E=u(0,0),C=u(h,f),F=u(g,v);if(t.beginPath(),t.moveTo(E.px,E.py),t.lineTo(C.px,C.py),t.strokeStyle="rgba(200, 202, 212, 0.6)",t.lineWidth=2,t.stroke(),t.beginPath(),t.moveTo(C.px,C.py),t.lineTo(F.px,F.py),t.strokeStyle="rgba(0, 212, 170, 0.7)",t.lineWidth=2,t.stroke(),t.beginPath(),t.arc(C.px,C.py,B,0,Math.PI*2),t.fillStyle="rgba(200, 202, 212, 0.5)",t.fill(),t.beginPath(),t.arc(F.px,F.py,R,0,Math.PI*2),t.fillStyle="#00d4aa",t.fill(),t.shadowColor="rgba(0, 212, 170, 0.5)",t.shadowBlur=8,t.fill(),t.shadowBlur=0,t.beginPath(),t.arc(E.px,E.py,2.5,0,Math.PI*2),t.fillStyle="rgba(200, 202, 212, 0.4)",t.fill(),t.font="500 10px monospace",t.fillStyle="rgba(200, 202, 212, 0.7)",t.textAlign="left",(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&t.fillText(`l₁ ${c.l1.toFixed(2)}  l₂ ${c.l2.toFixed(2)}`,8,i-32),t.fillText(`θ₁ ${c.t1.toFixed(2)}`,8,i-20),t.fillText(`θ₂ ${c.t2.toFixed(2)}`,8,i-8),this.diverged&&(t.font="600 9px monospace",t.fillStyle="rgba(232, 160, 48, 0.9)",t.textAlign="right",t.fillText("DIVERGED",e-6,i-8)),this.lastAnalysis)if(t.font="500 10px monospace",t.textAlign="right",this.lastAnalysis.isPeriodic){t.fillStyle="rgba(100, 220, 120, 0.9)";const y=this.lastAnalysis.period!==null?this.lastAnalysis.period.toFixed(2):"?";t.fillText(`PERIODIC  T=${y}s`,e-6,18),t.fillStyle="rgba(100, 220, 120, 0.5)",t.fillText(`conf ${(this.lastAnalysis.confidence*100).toFixed(0)}%`,e-6,30)}else t.fillStyle="rgba(220, 100, 100, 0.9)",t.fillText("CHAOTIC",e-6,18),this.lastAnalysis.confidence>0&&(t.fillStyle="rgba(220, 100, 100, 0.5)",t.fillText(`conf ${(this.lastAnalysis.confidence*100).toFixed(0)}%`,e-6,30));t.restore();const G=this.systemKey==="elastic"||this.systemKey==="nonlinear";this.phaseSpaceGraph.draw(G),this.phaseSpaceGraph.drawPoincare()}rebuildForConfig(t){const e=t.system==="rigid"?"rigid":t.system==="nonlinear"?"nonlinear":"elastic";if(this.config=t,e!==this.systemKey){this.systemKey=e,(e==="elastic"||e==="nonlinear")&&(this.baseBPair||(this.baseBPair=this.makePair()),this.pertBPair||(this.pertBPair=this.makePair()),this.baseSB||(this.baseSB=new Float32Array(4)),this.pertSB||(this.pertSB=new Float32Array(4)));const i=this.gl;i.deleteProgram(this.initProg.program),i.deleteVertexArray(this.initProg.vao),i.deleteProgram(this.physicsProg.program),i.deleteVertexArray(this.physicsProg.vao),this.initProg=this.buildProg(P.buildPreviewInit(this.systemKey)),this.physicsProg=this.buildProg(P.buildPreviewPhysicsLoop(this.systemKey))}this.onLeave()}dispose(){this.stopAnim(),clearTimeout(this.debounceTimer??void 0);const t=this.gl;t.deleteProgram(this.initProg.program),t.deleteVertexArray(this.initProg.vao),t.deleteProgram(this.physicsProg.program),t.deleteVertexArray(this.physicsProg.vao),t.deleteFramebuffer(this.fb),t.deleteBuffer(this.quadBuf);const e=[this.baseAPair,this.pertAPair];this.baseBPair&&e.push(this.baseBPair),this.pertBPair&&e.push(this.pertBPair);for(const i of e)t.deleteTexture(i[0]),t.deleteTexture(i[1])}}class pt{constructor(t,e){o(this,"gl");o(this,"config");o(this,"quadBuffer");o(this,"sharedTextures");o(this,"sharedUniforms");o(this,"simulator",null);o(this,"renderer");o(this,"zoomController");o(this,"ui");o(this,"stats");o(this,"preview");o(this,"canvas");o(this,"isDragging",!1);o(this,"dragStart",null);o(this,"dragCurrent",null);this.canvas=t,this.config={...e};const i=t.getContext("webgl2",{antialias:!1,preserveDrawingBuffer:!0});if(!i)throw new Error("WebGL 2.0 not supported");this.gl=i,i.getExtension("EXT_color_buffer_float"),this.quadBuffer=new et(i),this.sharedTextures=new $(i),this.sharedUniforms=new q(i),this.renderer=new rt(i,this.config,this.sharedTextures,this.sharedUniforms,this.quadBuffer.buffer),this.zoomController=new L(this.config,()=>this.onZoomChange()),this.ui=new nt,this.stats=new ot,this.preview=new mt(document.getElementById("canvasWrapper"),t,this.gl,this.config),this.setupControls(),this.setupZoomControls(),this.rebuildSimulator(),this.animate()}rebuildSimulator(){this.simulator&&this.simulator.dispose(),this.simulator=new st(this.gl,this.config,this.quadBuffer.buffer),this.preview.rebuildForConfig(this.config),this.config.vizMode==="divergence"?this.simulator.startDivergence(()=>this.onDivergenceRender()):this.simulator.reset()}onDivergenceRender(){this.simulator&&this.renderer.computeMaxValue(this.simulator.getDataTexture())}onZoomChange(){this.ui.updatePhaseSpaceInputs(this.config),this.rebuildSimulator()}setupControls(){this.ui.bindControl("systemType",e=>{this.config.system=e,this.handleSystemChange(),this.ui.updateModeUI(this.config),this.ui.updatePendulumParams(this.config),this.ui.updatePhaseSpaceInputs(this.config),this.rebuildSimulator()}),this.ui.bindControl("vizMode",e=>{this.config.vizMode=e,this.ui.updateModeUI(this.config),this.rebuildSimulator()}),this.ui.bindControl("resolution",e=>{this.config.resolution=parseInt(e),this.canvas.width=this.config.resolution,this.canvas.height=this.config.resolution,this.rebuildSimulator()},"change"),this.ui.bindControl("xDimension",e=>{this.config.phaseSpace.x.dimension=e,this.applyAxisDefaults("x"),this.ui.updatePhaseSpaceInputs(this.config),this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension,this.config.phaseSpace.y.dimension),this.zoomController=new L(this.config,()=>this.onZoomChange()),this.rebuildSimulator()},"change"),this.ui.bindControl("yDimension",e=>{this.config.phaseSpace.y.dimension=e,this.applyAxisDefaults("y"),this.ui.updatePhaseSpaceInputs(this.config),this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension,this.config.phaseSpace.y.dimension),this.zoomController=new L(this.config,()=>this.onZoomChange()),this.rebuildSimulator()},"change"),["xMin","xMax","yMin","yMax"].forEach(e=>{this.ui.bindControl(e,i=>{const s=parseFloat(i);e==="xMin"?this.config.phaseSpace.x.min=s:e==="xMax"?this.config.phaseSpace.x.max=s:e==="yMin"?this.config.phaseSpace.y.min=s:e==="yMax"&&(this.config.phaseSpace.y.max=s),this.zoomController=new L(this.config,()=>this.onZoomChange()),this.rebuildSimulator()},"change")}),Object.entries({initAngle1:"angle1",initVelocity1:"velocity1",initAngle2:"angle2",initVelocity2:"velocity2",initStretch1:"stretch1",initStretchRate1:"stretchRate1",initStretch2:"stretch2",initStretchRate2:"stretchRate2"}).forEach(([e,i])=>{this.ui.bindControl(e,s=>{this.config.phaseSpace.initialValues[i]=parseFloat(s),this.rebuildSimulator()},"change")}),this.ui.bindControl("dt",e=>{this.config.dt=parseFloat(e),this.ui.updateIntegrationInputs(this.config)},"change"),this.ui.bindControl("iterations",e=>{this.config.iterationsPerFrame=parseInt(e),this.ui.setTextContent("iterValue",String(this.config.iterationsPerFrame))}),this.ui.bindControl("maxIter",e=>{this.config.maxIter=parseInt(e),this.rebuildSimulator()},"change"),this.ui.bindControl("perturb",e=>{this.config.perturb=parseFloat(e),this.ui.setTextContent("perturbValue",this.config.perturb.toFixed(6)),this.rebuildSimulator()}),this.ui.bindControl("colormap",e=>{this.config.colormap=parseInt(e),this.ui.updateLegend(this.config.colormap)},"change"),this.ui.bindControl("toneMapping",e=>{this.config.toneMapping=parseInt(e)},"change"),this.ui.bindButton("resetBtn",()=>{this.zoomController.reset(),this.ui.updatePhaseSpaceInputs(this.config),this.rebuildSimulator()}),this.ui.bindButton("downloadBtn",()=>this.download()),this.ui.bindControl("m1",e=>{this.config.m1=parseFloat(e),this.ui.setTextContent("m1Value",this.config.m1.toFixed(1)),this.rebuildSimulator()}),this.ui.bindControl("m2",e=>{this.config.m2=parseFloat(e),this.ui.setTextContent("m2Value",this.config.m2.toFixed(1)),this.rebuildSimulator()}),this.ui.bindControl("L1",e=>{this.config.L1=parseFloat(e),this.ui.setTextContent("L1Value",this.config.L1.toFixed(1)),this.rebuildSimulator()}),this.ui.bindControl("L2",e=>{this.config.L2=parseFloat(e),this.ui.setTextContent("L2Value",this.config.L2.toFixed(1)),this.rebuildSimulator()}),this.ui.bindControl("k1",e=>{this.config.k1=parseFloat(e),this.ui.setTextContent("k1Value",String(this.config.k1)),this.rebuildSimulator()}),this.ui.bindControl("k2",e=>{this.config.k2=parseFloat(e),this.ui.setTextContent("k2Value",String(this.config.k2)),this.rebuildSimulator()}),this.ui.updateModeUI(this.config),this.ui.updateLegend(this.config.colormap),this.ui.updatePendulumParams(this.config),this.ui.updatePhaseSpaceInputs(this.config),this.ui.updateIntegrationInputs(this.config),this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension,this.config.phaseSpace.y.dimension)}handleSystemChange(){const e=this.config.system!=="rigid"?j:Z;e.includes(this.config.phaseSpace.x.dimension)||(this.config.phaseSpace.x.dimension="angle1",this.applyAxisDefaults("x")),(!e.includes(this.config.phaseSpace.y.dimension)||this.config.phaseSpace.y.dimension===this.config.phaseSpace.x.dimension)&&(this.config.phaseSpace.y.dimension="angle2",this.applyAxisDefaults("y"))}applyAxisDefaults(t){const e=this.config.phaseSpace[t].dimension;e.startsWith("angle")?(this.config.phaseSpace[t].min=-Math.PI,this.config.phaseSpace[t].max=Math.PI):e.startsWith("stretch")&&!e.includes("Rate")?(this.config.phaseSpace[t].min=-.5,this.config.phaseSpace[t].max=.5):(this.config.phaseSpace[t].min=-5,this.config.phaseSpace[t].max=5)}setupZoomControls(){const t=document.getElementById("zoomOverlay");this.canvas.addEventListener("mousedown",e=>{if(e.button!==0)return;const i=this.canvas.getBoundingClientRect(),s=(e.clientX-i.left)*(this.canvas.width/i.width),a=(e.clientY-i.top)*(this.canvas.height/i.height);this.isDragging=!0,this.preview.setDragging(!0),this.dragStart={x:s,y:a},this.dragCurrent={x:s,y:a}}),this.canvas.addEventListener("mousemove",e=>{if(!this.isDragging)return;const i=this.canvas.getBoundingClientRect();this.dragCurrent={x:(e.clientX-i.left)*(this.canvas.width/i.width),y:(e.clientY-i.top)*(this.canvas.height/i.height)},this.updateZoomOverlay()}),this.canvas.addEventListener("mouseup",()=>{if(!this.isDragging)return;Math.sqrt((this.dragCurrent.x-this.dragStart.x)**2+(this.dragCurrent.y-this.dragStart.y)**2)>5&&this.zoomController.applyRectangle(this.dragStart.x,this.dragStart.y,this.dragCurrent.x,this.dragCurrent.y,this.canvas.width,this.canvas.height),this.isDragging=!1,this.preview.setDragging(!1),this.dragStart=null,this.dragCurrent=null,t.style.display="none"}),this.canvas.addEventListener("mouseleave",()=>{this.isDragging=!1,this.preview.setDragging(!1),this.dragStart=null,this.dragCurrent=null,t.style.display="none"}),this.canvas.addEventListener("contextmenu",e=>{e.preventDefault(),this.zoomController.zoomOut()}),this.ui.bindButton("zoomOutBtn",()=>this.zoomController.zoomOut())}updateZoomOverlay(){const t=document.getElementById("zoomOverlay"),e=document.getElementById("canvasWrapper");this.canvas.getBoundingClientRect();const i=e.getBoundingClientRect(),s=i.width/this.canvas.width,a=i.height/this.canvas.height,r=Math.min(this.dragStart.x,this.dragCurrent.x)*s,n=Math.min(this.dragStart.y,this.dragCurrent.y)*a,l=Math.max(this.dragStart.x,this.dragCurrent.x)*s,u=Math.max(this.dragStart.y,this.dragCurrent.y)*a;t.style.display="block",t.style.left=r+"px",t.style.top=n+"px",t.style.width=l-r+"px",t.style.height=u-n+"px"}animate(){if(this.simulator){const t=this.config.vizMode==="divergence";t||(this.simulator.stepDistance(),this.renderer.computeMaxValue(this.simulator.getDataTexture())),(!t||!this.simulator.isComplete())&&this.renderer.render(this.simulator.getDataTexture());const e=this.simulator.getFrameCount(),i=t&&this.simulator.isComplete();this.stats.update(this.config,e,this.renderer.getMaxValue(),i),this.ui.updateStats(e,this.renderer.getMaxValue(),this.stats.getFps(),this.zoomController.level)}requestAnimationFrame(()=>this.animate())}download(){var e;const t=document.createElement("a");t.download=`chaos-${this.config.system}-${this.config.vizMode}-frame${((e=this.simulator)==null?void 0:e.getFrameCount())??0}.png`,t.href=this.canvas.toDataURL("image/png"),t.click()}}const X=document.getElementById("canvas");if(!X)throw new Error("Canvas not found");new pt(X,Q);
