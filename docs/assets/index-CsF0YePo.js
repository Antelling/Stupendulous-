var Q=Object.defineProperty;var tt=(h,t,e)=>t in h?Q(h,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):h[t]=e;var o=(h,t,e)=>tt(h,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function e(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(s){if(s.ep)return;s.ep=!0;const a=e(s);fetch(s.href,a)}})();const et=["angle1","velocity1","angle2","velocity2"],it=["angle1","velocity1","stretch1","stretchRate1","angle2","velocity2","stretch2","stretchRate2"],st={system:"rigid",vizMode:"distance",resolution:512,chunkSize:512,phaseSpace:{x:{dimension:"angle1",min:-Math.PI,max:Math.PI},y:{dimension:"angle2",min:-Math.PI,max:Math.PI},initialValues:{angle1:0,velocity1:0,angle2:0,velocity2:0,stretch1:0,stretchRate1:0,stretch2:0,stretchRate2:0}},dt:.002,iterationsPerFrame:10,maxIter:5e3,perturb:1e-5,perturbDistribution:"uniform",trials:1,m1:1,m2:1,L1:1,L2:1,k1:50,k2:50,colormap:6,toneMapping:0,seed:Math.random()*1e3},at={rigid:"Rigid",elastic12:"Elastic Double Pendulum",nonlinear:"Nonlinear Elastic Pendulum"},rt={distance:"Bob2 Distance",divergence:"Divergence Time",divergenceDistance:"Divergence Distance"};class nt{constructor(t){o(this,"buffer");this.gl=t;const e=t.createBuffer();if(!e)throw new Error("Failed to create buffer");this.buffer=e;const i=new Float32Array([-1,-1,1,-1,-1,1,1,1]);t.bindBuffer(t.ARRAY_BUFFER,this.buffer),t.bufferData(t.ARRAY_BUFFER,i,t.STATIC_DRAW)}bind(){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer)}draw(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}}class Y{constructor(t){this.gl=t}createFloatTexture(t){const e=this.gl.createTexture();if(!e)throw new Error("Failed to create texture");return this.gl.bindTexture(this.gl.TEXTURE_2D,e),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA32F,t,t,0,this.gl.RGBA,this.gl.FLOAT,null),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.NEAREST),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.NEAREST),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),e}createTexturePair(t){return[this.createFloatTexture(t),this.createFloatTexture(t)]}bindTexture(t,e){this.gl.activeTexture(this.gl.TEXTURE0+t),this.gl.bindTexture(this.gl.TEXTURE_2D,e)}}class j{constructor(t){this.gl=t}getLocation(t,e){return this.gl.getUniformLocation(t,e)}setIfFound(t,e,i){const s=this.getLocation(t,e);s!==null&&i(s)}set1f(t,e,i){this.setIfFound(t,e,s=>this.gl.uniform1f(s,i))}set1i(t,e,i){this.setIfFound(t,e,s=>this.gl.uniform1i(s,i))}set2f(t,e,i,s){this.setIfFound(t,e,a=>this.gl.uniform2f(a,i,s))}set4f(t,e,i,s,a,r){this.setIfFound(t,e,n=>this.gl.uniform4f(n,i,s,a,r))}set1b(t,e,i){this.setIfFound(t,e,s=>this.gl.uniform1i(s,i?1:0))}}class ot{constructor(t){this.gl=t}create(){const t=this.gl.createFramebuffer();if(!t)throw new Error("Failed to create framebuffer");return t}attachColor(t,e){this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,t,this.gl.TEXTURE_2D,e,0)}checkStatus(){const t=this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);if(t!==this.gl.FRAMEBUFFER_COMPLETE)throw new Error(`Framebuffer incomplete: ${t}`)}bind(t){this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,t)}}class X{constructor(t){this.gl=t}compile(t,e){const i=this.gl.createShader(t);if(!i)throw new Error("Failed to create shader");if(this.gl.shaderSource(i,e.trim()),this.gl.compileShader(i),!this.gl.getShaderParameter(i,this.gl.COMPILE_STATUS)){const s=this.gl.getShaderInfoLog(i);throw this.gl.deleteShader(i),new Error(`Shader compile error: ${s}`)}return i}linkProgram(t,e,i){const s=this.compile(this.gl.VERTEX_SHADER,t),a=this.compile(this.gl.FRAGMENT_SHADER,e),r=this.gl.createProgram();if(!r)throw new Error("Failed to create program");if(this.gl.attachShader(r,s),this.gl.attachShader(r,a),this.gl.linkProgram(r),this.gl.deleteShader(s),this.gl.deleteShader(a),!this.gl.getProgramParameter(r,this.gl.LINK_STATUS)){const n=this.gl.getProgramInfoLog(r);throw this.gl.deleteProgram(r),new Error(`Program link error (${i}): ${n}`)}return{program:r,name:i}}}const k=`// Rigid double pendulum ODE right-hand side
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
`,I=`// Elastic double pendulum ODE right-hand side
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
`,L=`// Nonlinear elastic double pendulum ODE right-hand side
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
`,P=`// Compute bob2 position given angles and arm lengths
// Defines: computeBob2(theta1, theta2, l1, l2, out x2, out y2)

void computeBob2(float theta1, float theta2, float l1, float l2, out float x2, out float y2) {
    float x1 = l1 * sin(theta1);
    float y1 = -l1 * cos(theta1);
    x2 = x1 + l2 * sin(theta2);
    y2 = y1 - l2 * cos(theta2);
}
`,O=`// Hash function for random perturbation
// Defines: hash(vec2 p) -> float

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,b=`#version 300 es
precision highp float;
`;class M{static buildInit(t,e){return e==="divergenceDistance"?t==="rigid"?this.rigidDivDistanceInit():t==="nonlinear"?this.nonlinearDivDistanceInit():this.elasticDivDistanceInit():t==="rigid"?e==="distance"?this.rigidDistanceInit():this.rigidDivergenceInit():t==="nonlinear"?e==="distance"?this.nonlinearDistanceInit():this.nonlinearDivergenceInit():e==="distance"?this.elasticDistanceInit():this.elasticDivergenceInit()}static buildPhysics(t){return t==="rigid"?this.rigidPhysics():t==="nonlinear"?this.nonlinearPhysics():this.elasticPhysics()}static buildAccumulate(t){return t==="rigid"?this.rigidAccumulate():t==="nonlinear"?this.nonlinearAccumulate():this.elasticAccumulate()}static buildBlit(){return`${b}
uniform sampler2D u_src;
in vec2 v_uv;
out vec4 fragColor;

void main() {
    fragColor = texture(u_src, v_uv);
}`}static buildBlend(){return`${b}
uniform sampler2D u_accum;
uniform sampler2D u_newTrial;
uniform float u_weight;
in vec2 v_uv;
out vec4 fragColor;

void main() {
    vec4 a = texture(u_accum, v_uv);
    vec4 n = texture(u_newTrial, v_uv);
    fragColor = mix(a, n, u_weight);
}`}static buildDivergenceStep(t,e="divergence"){return e==="divergenceDistance"?t==="rigid"?this.rigidDivDistanceStep():t==="nonlinear"?this.nonlinearDivDistanceStep():this.elasticDivDistanceStep():t==="rigid"?this.rigidDivergenceStep():t==="nonlinear"?this.nonlinearDivergenceStep():this.elasticDivergenceStep()}static chunkCoordHelpers(){return`
vec2 getChunkedUV(vec2 v_uv, vec2 chunkOffset, float chunkScale) {
    return chunkOffset + v_uv * chunkScale;
}
`}static perturbHelpers(){return`
uniform int u_perturbMode;
float samplePerturb(vec2 hi) {
    if (u_perturbMode == 0) {
        return (hash(hi) - 0.5) * 2.0 * u_perturb;
    }
    float u1 = max(hash(hi), 1e-10);
    float u2 = hash(hi + vec2(1000.0, -999.0));
    return sqrt(-2.0 * log(u1)) * cos(6.28318530718 * u2) * u_perturb;
}
`}static mappingHelpers(){return`
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
`}static rigidDistanceInit(){return`${b}
uniform vec4 u_initialState;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 fragColor;

${this.chunkCoordHelpers()}

void main() {
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 state = u_initialState;
    float dx = mix(u_xRange.x, u_xRange.y, uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, uv.y);
    if (u_xDim == 0) state.x += dx;
    else if (u_xDim == 1) state.y += dx;
    else if (u_xDim == 4) state.z += dx;
    else if (u_xDim == 5) state.w += dx;
    if (u_yDim == 0) state.x += dy;
    else if (u_yDim == 1) state.y += dy;
    else if (u_yDim == 4) state.z += dy;
    else if (u_yDim == 5) state.w += dy;
    fragColor = state;
}`}static rigidDivergenceInit(){return`${b}
uniform vec4 u_initialState;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform float u_perturb;
uniform float u_seed;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;

${O}
${this.perturbHelpers()}
${this.chunkCoordHelpers()}

void main() {
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 state = u_initialState;
    float dx = mix(u_xRange.x, u_xRange.y, uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, uv.y);
    if (u_xDim == 0) state.x += dx;
    else if (u_xDim == 1) state.y += dx;
    else if (u_xDim == 4) state.z += dx;
    else if (u_xDim == 5) state.w += dx;
    if (u_yDim == 0) state.x += dy;
    else if (u_yDim == 1) state.y += dy;
    else if (u_yDim == 4) state.z += dy;
    else if (u_yDim == 5) state.w += dy;

    float perturb_theta1 = samplePerturb(uv * 1000.0 + u_seed);
    float perturb_theta2 = samplePerturb(uv * 1000.0 + vec2(100.0, u_seed));

    baseState = state;
    perturbedState = state + vec4(perturb_theta1, 0.0, perturb_theta2, 0.0);
    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`}static elasticDistanceInit(){return`${b}
uniform vec4 u_initialA;
uniform vec4 u_initialB;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 stateA;
layout(location = 1) out vec4 stateB;

${this.mappingHelpers()}
${this.chunkCoordHelpers()}

void main() {
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 a = u_initialA;
    vec4 b = u_initialB;
    float dx = mix(u_xRange.x, u_xRange.y, uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, uv.y);
    applyMapping(a, b, u_xDim, dx);
    applyMapping(a, b, u_yDim, dy);
    stateA = a;
    stateB = b;
}`}static nonlinearDistanceInit(){return this.elasticDistanceInit()}static nonlinearDivergenceInit(){return`${b}
uniform vec4 u_initialA;
uniform vec4 u_initialB;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform float u_perturb;
uniform float u_seed;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 baseA;
layout(location = 1) out vec4 baseB;
layout(location = 2) out vec4 pertA;
layout(location = 3) out vec4 pertB;
layout(location = 4) out vec4 divergenceData;

${O}
${this.perturbHelpers()}
${this.mappingHelpers()}
${this.chunkCoordHelpers()}

void main() {
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 a = u_initialA;
    vec4 b = u_initialB;
    float dx = mix(u_xRange.x, u_xRange.y, uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, uv.y);
    applyMapping(a, b, u_xDim, dx);
    applyMapping(a, b, u_yDim, dy);

    float perturb_theta1 = samplePerturb(uv * 1000.0 + u_seed);
    float perturb_theta2 = samplePerturb(uv * 1000.0 + vec2(100.0, u_seed));

    baseA = a;
    baseB = b;
    pertA = a + vec4(perturb_theta1, 0.0, 0.0, 0.0);
    pertB = b + vec4(perturb_theta2, 0.0, 0.0, 0.0);

    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`}static elasticDivergenceInit(){return`${b}
uniform vec4 u_initialA;
uniform vec4 u_initialB;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform float u_perturb;
uniform float u_seed;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 baseA;
layout(location = 1) out vec4 baseB;
layout(location = 2) out vec4 pertA;
layout(location = 3) out vec4 pertB;
layout(location = 4) out vec4 divergenceData;

${O}
${this.perturbHelpers()}
${this.mappingHelpers()}
${this.chunkCoordHelpers()}

void main() {
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 a = u_initialA;
    vec4 b = u_initialB;
    float dx = mix(u_xRange.x, u_xRange.y, uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, uv.y);
    applyMapping(a, b, u_xDim, dx);
    applyMapping(a, b, u_yDim, dy);

    float perturb_theta1 = samplePerturb(uv * 1000.0 + u_seed);
    float perturb_theta2 = samplePerturb(uv * 1000.0 + vec2(100.0, u_seed));

    baseA = a;
    baseB = b;
    pertA = a + vec4(perturb_theta1, 0.0, 0.0, 0.0);
    pertB = b + vec4(perturb_theta2, 0.0, 0.0, 0.0);

    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`}static rigidPhysics(){return`${b}
uniform sampler2D u_stateTexture;
uniform float u_dt;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
out vec4 fragColor;

${k}

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
}`}static elasticPhysics(){return`${b}
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

${I}

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
}`}static nonlinearPhysics(){return`${b}
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

${L}

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
}`}static rigidAccumulate(){return`${b}
uniform sampler2D u_stateTexture;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${P}

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
}`}static elasticAccumulate(){return`${b}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${P}

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
}`}static nonlinearAccumulate(){return`${b}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${P}

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
}`}static rigidDivergenceStep(){return`${b}
uniform sampler2D u_stateTexture;
uniform sampler2D u_perturbedTexture;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform int u_currentIter;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;

const float PI = 3.14159265359;

${k}
${this.chunkCoordHelpers()}

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
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 base = texture(u_stateTexture, uv);
    vec4 pert = texture(u_perturbedTexture, uv);
    vec4 div = texture(u_divergenceTexture, uv);

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
}`}static elasticDivergenceStep(){return`${b}
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
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 outBaseA;
layout(location = 1) out vec4 outBaseB;
layout(location = 2) out vec4 outPertA;
layout(location = 3) out vec4 outPertB;
layout(location = 4) out vec4 divergenceData;

const float PI = 3.14159265359;

${I}
${this.chunkCoordHelpers()}

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
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 bA = texture(u_baseTextureA, uv);
    vec4 bB = texture(u_baseTextureB, uv);
    vec4 pA = texture(u_pertTextureA, uv);
    vec4 pB = texture(u_pertTextureB, uv);
    vec4 div = texture(u_divergenceTexture, uv);

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
}`}static nonlinearDivergenceStep(){return`${b}
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
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 outBaseA;
layout(location = 1) out vec4 outBaseB;
layout(location = 2) out vec4 outPertA;
layout(location = 3) out vec4 outPertB;
layout(location = 4) out vec4 divergenceData;

const float PI = 3.14159265359;

${L}
${this.chunkCoordHelpers()}

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
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 bA = texture(u_baseTextureA, uv);
    vec4 bB = texture(u_baseTextureB, uv);
    vec4 pA = texture(u_pertTextureA, uv);
    vec4 pB = texture(u_pertTextureB, uv);
    vec4 div = texture(u_divergenceTexture, uv);

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
}`}static rigidDivDistanceInit(){return`${b}
uniform vec4 u_initialState;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform float u_perturb;
uniform float u_seed;
uniform float u_L1;
uniform float u_L2;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;

${O}
${this.perturbHelpers()}
${P}
${this.chunkCoordHelpers()}

void main() {
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 state = u_initialState;
    float dx = mix(u_xRange.x, u_xRange.y, uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, uv.y);
    if (u_xDim == 0) state.x += dx;
    else if (u_xDim == 1) state.y += dx;
    else if (u_xDim == 4) state.z += dx;
    else if (u_xDim == 5) state.w += dx;
    if (u_yDim == 0) state.x += dy;
    else if (u_yDim == 1) state.y += dy;
    else if (u_yDim == 4) state.z += dy;
    else if (u_yDim == 5) state.w += dy;

    float perturb_theta1 = samplePerturb(uv * 1000.0 + u_seed);
    float perturb_theta2 = samplePerturb(uv * 1000.0 + vec2(100.0, u_seed));

    baseState = state;
    perturbedState = state + vec4(perturb_theta1, 0.0, perturb_theta2, 0.0);

    float bx2, by2;
    computeBob2(state.x, state.z, u_L1, u_L2, bx2, by2);
    divergenceData = vec4(bx2, by2, 0.0, 0.0);
}`}static elasticDivDistanceInit(){return`${b}
uniform vec4 u_initialA;
uniform vec4 u_initialB;
uniform vec2 u_xRange;
uniform vec2 u_yRange;
uniform int u_xDim;
uniform int u_yDim;
uniform float u_perturb;
uniform float u_seed;
uniform float u_L1;
uniform float u_L2;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 baseA;
layout(location = 1) out vec4 baseB;
layout(location = 2) out vec4 pertA;
layout(location = 3) out vec4 pertB;
layout(location = 4) out vec4 divergenceData;

${O}
${this.perturbHelpers()}
${P}
${this.mappingHelpers()}
${this.chunkCoordHelpers()}

void main() {
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 a = u_initialA;
    vec4 b = u_initialB;
    float dx = mix(u_xRange.x, u_xRange.y, uv.x);
    float dy = mix(u_yRange.x, u_yRange.y, uv.y);
    applyMapping(a, b, u_xDim, dx);
    applyMapping(a, b, u_yDim, dy);

    float perturb_theta1 = samplePerturb(uv * 1000.0 + u_seed);
    float perturb_theta2 = samplePerturb(uv * 1000.0 + vec2(100.0, u_seed));

    baseA = a;
    baseB = b;
    pertA = a + vec4(perturb_theta1, 0.0, 0.0, 0.0);
    pertB = b + vec4(perturb_theta2, 0.0, 0.0, 0.0);

    float bx2, by2;
    computeBob2(a.x, b.x, u_L1 + a.z, u_L2 + b.z, bx2, by2);
    divergenceData = vec4(bx2, by2, 0.0, 0.0);
}`}static nonlinearDivDistanceInit(){return this.elasticDivDistanceInit()}static rigidDivDistanceStep(){return`${b}
uniform sampler2D u_stateTexture;
uniform sampler2D u_perturbedTexture;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;

const float PI = 3.14159265359;

${k}
${P}
${this.chunkCoordHelpers()}

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
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 base = texture(u_stateTexture, uv);
    vec4 pert = texture(u_perturbedTexture, uv);
    vec4 div = texture(u_divergenceTexture, uv);

    float prevBx2 = div.x, prevBy2 = div.y;
    float totalDist = div.z;
    float hasDiv = div.w;

    float bt1 = base.x, bo1 = base.y, bt2 = base.z, bo2 = base.w;
    float pt1 = pert.x, po1 = pert.y, pt2 = pert.z, po2 = pert.w;

    verletStep(bt1, bo1, bt2, bo2);
    verletStep(pt1, po1, pt2, po2);

    baseState = vec4(bt1, bo1, bt2, bo2);
    perturbedState = vec4(pt1, po1, pt2, po2);

    float bx2, by2;
    computeBob2(bt1, bt2, u_L1, u_L2, bx2, by2);

    if (hasDiv < 0.5) {
        float delta = sqrt((bx2 - prevBx2) * (bx2 - prevBx2) + (by2 - prevBy2) * (by2 - prevBy2));
        totalDist += delta;

        float divDist = measureDivergence(bt1, bo1, bt2, bo2, pt1, po1, pt2, po2);
        if (divDist > 0.05) {
            hasDiv = 1.0;
        }
    }

    divergenceData = vec4(bx2, by2, totalDist, hasDiv);
}`}static elasticDivDistanceStep(){return`${b}
uniform sampler2D u_baseTextureA;
uniform sampler2D u_baseTextureB;
uniform sampler2D u_pertTextureA;
uniform sampler2D u_pertTextureB;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform float u_k1;
uniform float u_k2;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 outBaseA;
layout(location = 1) out vec4 outBaseB;
layout(location = 2) out vec4 outPertA;
layout(location = 3) out vec4 outPertB;
layout(location = 4) out vec4 divergenceData;

const float PI = 3.14159265359;

${I}
${P}
${this.chunkCoordHelpers()}

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
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 bA = texture(u_baseTextureA, uv);
    vec4 bB = texture(u_baseTextureB, uv);
    vec4 pA = texture(u_pertTextureA, uv);
    vec4 pB = texture(u_pertTextureB, uv);
    vec4 div = texture(u_divergenceTexture, uv);

    float prevBx2 = div.x, prevBy2 = div.y;
    float totalDist = div.z;
    float hasDiv = div.w;

    vec4 newBA, newBB, newPA, newPB;
    elasticStep(bA, bB, newBA, newBB);
    elasticStep(pA, pB, newPA, newPB);

    outBaseA = newBA;
    outBaseB = newBB;
    outPertA = newPA;
    outPertB = newPB;

    float bx2, by2;
    computeBob2(newBA.x, newBB.x, u_L1 + newBA.z, u_L2 + newBB.z, bx2, by2);

    if (hasDiv < 0.5) {
        float delta = sqrt((bx2 - prevBx2) * (bx2 - prevBx2) + (by2 - prevBy2) * (by2 - prevBy2));
        totalDist += delta;

        float dist = measureElasticDivergence(newBA, newBB, newPA, newPB);
        if (dist > 0.05) {
            hasDiv = 1.0;
        }
    }

    divergenceData = vec4(bx2, by2, totalDist, hasDiv);
}`}static nonlinearDivDistanceStep(){return`${b}
uniform sampler2D u_baseTextureA;
uniform sampler2D u_baseTextureB;
uniform sampler2D u_pertTextureA;
uniform sampler2D u_pertTextureB;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform float u_k1;
uniform float u_k2;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
uniform vec2 u_chunkOffset;
uniform float u_chunkScale;
in vec2 v_uv;
layout(location = 0) out vec4 outBaseA;
layout(location = 1) out vec4 outBaseB;
layout(location = 2) out vec4 outPertA;
layout(location = 3) out vec4 outPertB;
layout(location = 4) out vec4 divergenceData;

const float PI = 3.14159265359;

${L}
${P}
${this.chunkCoordHelpers()}

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
    vec2 uv = getChunkedUV(v_uv, u_chunkOffset, u_chunkScale);
    vec4 bA = texture(u_baseTextureA, uv);
    vec4 bB = texture(u_baseTextureB, uv);
    vec4 pA = texture(u_pertTextureA, uv);
    vec4 pB = texture(u_pertTextureB, uv);
    vec4 div = texture(u_divergenceTexture, uv);

    float prevBx2 = div.x, prevBy2 = div.y;
    float totalDist = div.z;
    float hasDiv = div.w;

    vec4 newBA, newBB, newPA, newPB;
    elasticStep(bA, bB, newBA, newBB);
    elasticStep(pA, pB, newPA, newPB);

    outBaseA = newBA;
    outBaseB = newBB;
    outPertA = newPA;
    outPertB = newPB;

    float bx2, by2;
    computeBob2(newBA.x, newBB.x, u_L1 + newBA.z, u_L2 + newBB.z, bx2, by2);

    if (hasDiv < 0.5) {
        float delta = sqrt((bx2 - prevBx2) * (bx2 - prevBx2) + (by2 - prevBy2) * (by2 - prevBy2));
        totalDist += delta;

        float dist = measureElasticDivergence(newBA, newBB, newPA, newPB);
        if (dist > 0.05) {
            hasDiv = 1.0;
        }
    }

    divergenceData = vec4(bx2, by2, totalDist, hasDiv);
}`}static buildPreviewPhysicsLoop(t){return t==="rigid"?this.previewRigidPhysicsLoop():t==="nonlinear"?this.previewNonlinearPhysicsLoop():this.previewElasticPhysicsLoop()}static buildPreviewInit(t){return t==="rigid"?this.previewRigidInit():t==="nonlinear"?this.previewNonlinearInit():this.previewElasticInit()}static buildPreviewDivergenceCheck(t){return t==="rigid"?this.previewRigidDivCheck():t==="nonlinear"?this.previewNonlinearDivCheck():this.previewElasticDivCheck()}static buildPreviewTrailAppend(t){return t==="rigid"?this.previewRigidTrailAppend():t==="nonlinear"?this.previewNonlinearTrailAppend():this.previewElasticTrailAppend()}static buildPreviewRender(t){return t==="rigid"?this.previewRigidRender():t==="nonlinear"?this.previewNonlinearRender():this.previewElasticRender()}static previewRigidPhysicsLoop(){return`${b}
uniform sampler2D u_stateTexture;
uniform float u_dt;
uniform int u_steps;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
out vec4 fragColor;

${k}

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
}`}static previewElasticPhysicsLoop(){return`${b}
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

${I}

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
}`}static previewNonlinearPhysicsLoop(){return`${b}
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

${L}

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
}`}static previewRigidInit(){return`${b}
uniform vec4 u_initialState;
uniform float u_perturb;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 pertState;

void main() {
    baseState = u_initialState;
    pertState = u_initialState + vec4(u_perturb, 0.0, u_perturb, 0.0);
}`}static previewElasticInit(){return`${b}
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
}`}static previewNonlinearInit(){return this.previewElasticInit()}static previewRigidDivCheck(){return`${b}
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
}`}static previewElasticDivCheck(){return`${b}
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
}`}static previewNonlinearDivCheck(){return this.previewElasticDivCheck()}static previewRigidTrailAppend(){return`${b}
uniform sampler2D u_baseState;
in vec2 v_uv;
out vec4 fragColor;

${P}

void main() {
    vec4 state = texelFetch(u_baseState, ivec2(0, 0), 0);
    float x2, y2;
    computeBob2(state.x, state.z, 1.0, 1.0, x2, y2);
    fragColor = vec4(x2, y2, 0.0, 1.0);
}`}static previewElasticTrailAppend(){return`${b}
uniform sampler2D u_baseA;
uniform sampler2D u_baseB;
in vec2 v_uv;
out vec4 fragColor;

${P}

void main() {
    vec4 sa = texelFetch(u_baseA, ivec2(0, 0), 0);
    vec4 sb = texelFetch(u_baseB, ivec2(0, 0), 0);
    float theta1 = sa.x, theta2 = sb.x, r1 = sa.z, r2 = sb.z;
    float x2, y2;
    computeBob2(theta1, theta2, 1.0 + r1, 1.0 + r2, x2, y2);
    fragColor = vec4(x2, y2, 0.0, 1.0);
}`}static previewNonlinearTrailAppend(){return`${b}
uniform sampler2D u_baseA;
uniform sampler2D u_baseB;
in vec2 v_uv;
out vec4 fragColor;

${P}

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
`}static previewRigidRender(){return`${b}
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
${P}

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
}`}static previewElasticRender(){return`${b}
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
${P}

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
}`}static previewNonlinearRender(){return this.previewElasticRender()}static buildBatchInit(t){return t==="rigid"?this.batchRigidInit():t==="nonlinear"?this.batchNonlinearInit():this.batchElasticInit()}static buildBatchPhysics(t){return t==="rigid"?this.batchRigidPhysics():t==="nonlinear"?this.batchNonlinearPhysics():this.batchElasticPhysics()}static batchHash(){return`
float batchHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}`}static batchRigidInit(){return`${b}
uniform vec4 u_seedState;
uniform float u_perturbScale;
uniform float u_seed;
in vec2 v_uv;
out vec4 fragColor;

${this.batchHash()}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    float idx = float(coord.x + coord.y * 1024);

    float r1 = batchHash(vec2(idx, u_seed));
    float r2 = batchHash(vec2(idx + 1.0, u_seed));
    float r3 = batchHash(vec2(idx + 2.0, u_seed));
    float r4 = batchHash(vec2(idx + 3.0, u_seed));

    vec4 state = u_seedState;
    state.x += (r1 - 0.5) * 2.0 * u_perturbScale;
    state.y += (r2 - 0.5) * 2.0 * u_perturbScale;
    state.z += (r3 - 0.5) * 2.0 * u_perturbScale;
    state.w += (r4 - 0.5) * 2.0 * u_perturbScale;

    fragColor = state;
}`}static batchElasticInit(){return`${b}
uniform vec4 u_seedA;
uniform vec4 u_seedB;
uniform float u_perturbScale;
uniform float u_seed;
in vec2 v_uv;
layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;

${this.batchHash()}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    float idx = float(coord.x + coord.y * 1024);

    float r1 = batchHash(vec2(idx, u_seed));
    float r2 = batchHash(vec2(idx + 1.0, u_seed));
    float r3 = batchHash(vec2(idx + 2.0, u_seed));
    float r4 = batchHash(vec2(idx + 3.0, u_seed));
    float r5 = batchHash(vec2(idx + 4.0, u_seed));
    float r6 = batchHash(vec2(idx + 5.0, u_seed));
    float r7 = batchHash(vec2(idx + 6.0, u_seed));
    float r8 = batchHash(vec2(idx + 7.0, u_seed));

    vec4 a = u_seedA;
    vec4 b = u_seedB;
    a.x += (r1 - 0.5) * 2.0 * u_perturbScale;
    a.y += (r2 - 0.5) * 2.0 * u_perturbScale;
    a.z += (r3 - 0.5) * 2.0 * u_perturbScale;
    a.w += (r4 - 0.5) * 2.0 * u_perturbScale;
    b.x += (r5 - 0.5) * 2.0 * u_perturbScale;
    b.y += (r6 - 0.5) * 2.0 * u_perturbScale;
    b.z += (r7 - 0.5) * 2.0 * u_perturbScale;
    b.w += (r8 - 0.5) * 2.0 * u_perturbScale;

    outA = a;
    outB = b;
}`}static batchNonlinearInit(){return this.batchElasticInit()}static batchRigidPhysics(){return`${b}
uniform sampler2D u_stateTexture;
uniform float u_dt;
uniform int u_steps;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
out vec4 fragColor;

${k}

void main() {
    vec4 s = texelFetch(u_stateTexture, ivec2(gl_FragCoord.xy), 0);
    float theta1 = s.x, omega1 = s.y, theta2 = s.z, omega2 = s.w;

    for (int i = 0; i < 500; i++) {
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
}`}static batchElasticPhysics(){return`${b}
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

${I}

void main() {
    vec4 sa = texelFetch(u_stateTextureA, ivec2(gl_FragCoord.xy), 0);
    vec4 sb = texelFetch(u_stateTextureB, ivec2(gl_FragCoord.xy), 0);

    for (int i = 0; i < 500; i++) {
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
}`}static batchNonlinearPhysics(){return`${b}
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

${L}

void main() {
    vec4 sa = texelFetch(u_stateTextureA, ivec2(gl_FragCoord.xy), 0);
    vec4 sb = texelFetch(u_stateTextureB, ivec2(gl_FragCoord.xy), 0);

    for (int i = 0; i < 500; i++) {
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
}`}}const K=`#version 300 es
precision highp float;

// Shared vertex shader - used by all programs
in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`,G={angle1:0,velocity1:1,stretch1:2,stretchRate1:3,angle2:4,velocity2:5,stretch2:6,stretchRate2:7};class lt{constructor(t,e,i){o(this,"gl");o(this,"config");o(this,"textures");o(this,"fb");o(this,"uniforms");o(this,"systemKey");o(this,"modeKey");o(this,"isElastic");o(this,"stateAPair",null);o(this,"stateBPair",null);o(this,"perturbedAPair",null);o(this,"perturbedBPair",null);o(this,"dataPair",null);o(this,"readIndex",0);o(this,"frameCount",0);o(this,"complete",!1);o(this,"framebuffer");o(this,"programs",new Map);o(this,"onDivergenceRender",null);o(this,"chunking",!1);o(this,"chunksPerSide",1);o(this,"currentChunkX",0);o(this,"currentChunkY",0);o(this,"chunkReadIndex",0);o(this,"chunkFrameCount",0);o(this,"chunkStateAPair",null);o(this,"chunkStateBPair",null);o(this,"chunkPerturbedAPair",null);o(this,"chunkPerturbedBPair",null);o(this,"chunkDataPair",null);o(this,"chunkResults",[]);o(this,"chunkDone",[]);o(this,"animatingFirstChunk",!1);o(this,"trials");o(this,"multiTrial");o(this,"currentTrial",0);o(this,"trialsCompleted",0);o(this,"accumPair",null);o(this,"chunkAccumPair",null);o(this,"accumReadIndex",0);this.quadBuffer=i,this.gl=t,this.config=e,this.textures=new Y(t),this.fb=new ot(t),this.uniforms=new j(t),this.systemKey=e.system==="elastic12"?"elastic":e.system,this.modeKey=e.vizMode,this.isElastic=this.systemKey==="elastic"||this.systemKey==="nonlinear";const s=this.modeKey==="divergence"||this.modeKey==="divergenceDistance";this.trials=s?Math.max(1,Math.floor(e.trials??1)):1,this.multiTrial=s&&this.trials>1;const a=e.resolution,r=e.chunkSize;if(this.chunking=r<a,this.chunking){this.chunksPerSide=a/r;const n=this.chunksPerSide*this.chunksPerSide;this.chunkStateAPair=this.textures.createTexturePair(r),this.isElastic&&(this.chunkStateBPair=this.textures.createTexturePair(r)),this.modeKey!=="distance"&&(this.chunkPerturbedAPair=this.textures.createTexturePair(r),this.isElastic&&(this.chunkPerturbedBPair=this.textures.createTexturePair(r)),this.multiTrial&&(this.chunkAccumPair=this.textures.createTexturePair(r))),this.chunkDataPair=this.textures.createTexturePair(r);for(let l=0;l<n;l++)this.chunkResults.push(this.textures.createFloatTexture(r)),this.chunkDone.push(!1)}else this.stateAPair=this.textures.createTexturePair(a),this.isElastic&&(this.stateBPair=this.textures.createTexturePair(a)),this.modeKey!=="distance"&&(this.perturbedAPair=this.textures.createTexturePair(a),this.isElastic&&(this.perturbedBPair=this.textures.createTexturePair(a)),this.multiTrial&&(this.accumPair=this.textures.createTexturePair(a))),this.dataPair=this.textures.createTexturePair(a);this.framebuffer=t.createFramebuffer(),this.compilePrograms()}compilePrograms(){const t=new X(this.gl);this.compileAndStore(t,"init",M.buildInit(this.systemKey,this.modeKey)),this.modeKey==="distance"?(this.compileAndStore(t,"physics",M.buildPhysics(this.systemKey)),this.compileAndStore(t,"accumulate",M.buildAccumulate(this.systemKey))):this.compileAndStore(t,"divergeStep",M.buildDivergenceStep(this.systemKey,this.modeKey)),this.chunking&&this.compileAndStore(t,"blit",M.buildBlit()),this.multiTrial&&this.compileAndStore(t,"blend",M.buildBlend())}compileAndStore(t,e,i){const s=t.linkProgram(K,i,e),a=this.gl.createVertexArray();this.gl.bindVertexArray(a),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.quadBuffer);const r=this.gl.getAttribLocation(s.program,"a_position");r>=0&&(this.gl.enableVertexAttribArray(r),this.gl.vertexAttribPointer(r,2,this.gl.FLOAT,!1,0,0)),this.gl.bindVertexArray(null),this.programs.set(e,{program:s.program,vao:a})}getProg(t){const e=this.programs.get(t);if(!e)throw new Error(`Program not found: ${t}`);return e}setPhaseSpaceUniforms(t){const e=this.config.phaseSpace,i=e.initialValues;this.systemKey==="rigid"?this.uniforms.set4f(t,"u_initialState",i.angle1,i.velocity1,i.angle2,i.velocity2):(this.uniforms.set4f(t,"u_initialA",i.angle1,i.velocity1,i.stretch1,i.stretchRate1),this.uniforms.set4f(t,"u_initialB",i.angle2,i.velocity2,i.stretch2,i.stretchRate2)),this.uniforms.set2f(t,"u_xRange",e.x.min,e.x.max),this.uniforms.set2f(t,"u_yRange",e.y.min,e.y.max),this.uniforms.set1i(t,"u_xDim",G[e.x.dimension]),this.uniforms.set1i(t,"u_yDim",G[e.y.dimension])}detachAll(){const t=this.gl;for(let e=0;e<8;e++)t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+e,t.TEXTURE_2D,null,0)}isChunkedMode(){return this.chunking}getChunksPerSide(){return this.chunksPerSide}getChunkResultTexture(t,e){return this.chunkDone[e*this.chunksPerSide+t]?this.chunkResults[e*this.chunksPerSide+t]:null}getCurrentChunkInfo(){if(!this.chunking||!this.animatingFirstChunk)return null;const t=this.multiTrial&&this.trialsCompleted>0?this.chunkAccumPair[this.accumReadIndex]:this.chunkDataPair[this.chunkReadIndex];return{cx:this.currentChunkX,cy:this.currentChunkY,texture:t}}reset(){this.readIndex=0,this.frameCount=0,this.complete=!1,this.currentChunkX=0,this.currentChunkY=0,this.chunkFrameCount=0,this.chunkReadIndex=0,this.animatingFirstChunk=!1,this.currentTrial=0,this.trialsCompleted=0,this.accumReadIndex=0;for(let i=0;i<this.chunkDone.length;i++)this.chunkDone[i]=!1;const t=this.gl,e=this.config.resolution;t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer),this.detachAll(),this.modeKey==="distance"?this.chunking?(t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer),this.detachAll(),this.initDistanceChunk(0,0),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindVertexArray(null),this.animatingFirstChunk=!0):(this.initDistanceStateFull(0,e),this.initDistanceDataFull(0,e)):this.chunking||this.initDivergenceFull(0,e),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindVertexArray(null)}stepDistance(){this.complete||(this.chunking?this.stepDistanceChunked():this.stepDistanceFull())}stepDistanceFull(){if(!this.dataPair)return;const t=this.config.maxIter-this.frameCount;if(t<=0){this.complete=!0;return}const e=this.gl,i=this.config.resolution,s=Math.min(this.config.iterationsPerFrame,t);e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer);for(let a=0;a<s;a++){const r=this.readIndex,n=1-this.readIndex;this.stepPhysics(this.stateAPair,this.stateBPair,r,n,i),this.stepAccumulate(this.stateAPair,this.stateBPair,this.dataPair,n,r,n,i),this.readIndex=n}this.frameCount+=s,this.frameCount>=this.config.maxIter&&(this.complete=!0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindVertexArray(null)}stepDistanceChunked(){const e=this.gl;if(this.chunkFrameCount>=this.config.maxIter){this.blitToResult(this.currentChunkX,this.currentChunkY,this.chunkDataPair[this.chunkReadIndex]),this.advanceChunk(),this.currentChunkY<this.chunksPerSide?(this.chunkFrameCount=0,this.chunkReadIndex=0,e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer),this.detachAll(),this.initDistanceChunk(this.currentChunkX,this.currentChunkY),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindVertexArray(null),this.animatingFirstChunk=!0):(this.animatingFirstChunk=!1,this.complete=!0);return}e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer);for(let i=0;i<20&&this.chunkFrameCount<this.config.maxIter;i++){this.chunkFrameCount++;const s=this.chunkReadIndex,a=1-this.chunkReadIndex;this.stepPhysics(this.chunkStateAPair,this.chunkStateBPair,s,a,this.config.chunkSize),this.stepAccumulate(this.chunkStateAPair,this.chunkStateBPair,this.chunkDataPair,a,s,a,this.config.chunkSize),this.chunkReadIndex=a}this.frameCount+=20,e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindVertexArray(null)}initDistanceChunk(t,e){const i=this.gl,s=this.config.chunkSize,a=this.getProg("init");i.useProgram(a.program),i.bindVertexArray(a.vao),this.setPhaseSpaceUniforms(a.program),this.uniforms.set2f(a.program,"u_chunkOffset",t/this.chunksPerSide,e/this.chunksPerSide),this.uniforms.set1f(a.program,"u_chunkScale",1/this.chunksPerSide),this.isElastic?(this.fb.attachColor(i.COLOR_ATTACHMENT0,this.chunkStateAPair[0]),this.fb.attachColor(i.COLOR_ATTACHMENT1,this.chunkStateBPair[0]),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1])):(this.fb.attachColor(i.COLOR_ATTACHMENT0,this.chunkStateAPair[0]),i.drawBuffers([i.COLOR_ATTACHMENT0])),i.viewport(0,0,s,s),i.drawArrays(i.TRIANGLE_STRIP,0,4),this.isElastic?(this.fb.attachColor(i.COLOR_ATTACHMENT0,this.chunkStateAPair[1]),this.fb.attachColor(i.COLOR_ATTACHMENT1,this.chunkStateBPair[1])):this.fb.attachColor(i.COLOR_ATTACHMENT0,this.chunkStateAPair[1]),i.drawArrays(i.TRIANGLE_STRIP,0,4);const r=this.getProg("accumulate");i.useProgram(r.program),i.bindVertexArray(r.vao),this.isElastic?(this.textures.bindTexture(0,this.chunkStateAPair[0]),this.textures.bindTexture(1,this.chunkStateBPair[0]),this.uniforms.set1i(r.program,"u_stateTextureA",0),this.uniforms.set1i(r.program,"u_stateTextureB",1)):(this.textures.bindTexture(0,this.chunkStateAPair[0]),this.uniforms.set1i(r.program,"u_stateTexture",0)),this.uniforms.set1b(r.program,"u_reset",!0),this.fb.attachColor(i.COLOR_ATTACHMENT0,this.chunkDataPair[0]),i.drawBuffers([i.COLOR_ATTACHMENT0]),i.viewport(0,0,s,s),i.drawArrays(i.TRIANGLE_STRIP,0,4)}initDistanceStateFull(t,e){const i=this.gl,s=this.getProg("init");i.useProgram(s.program),i.bindVertexArray(s.vao),this.setPhaseSpaceUniforms(s.program),this.uniforms.set2f(s.program,"u_chunkOffset",0,0),this.uniforms.set1f(s.program,"u_chunkScale",1),this.isElastic?(this.fb.attachColor(i.COLOR_ATTACHMENT0,this.stateAPair[t]),this.fb.attachColor(i.COLOR_ATTACHMENT1,this.stateBPair[t]),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1])):(this.fb.attachColor(i.COLOR_ATTACHMENT0,this.stateAPair[t]),i.drawBuffers([i.COLOR_ATTACHMENT0])),i.viewport(0,0,e,e),i.drawArrays(i.TRIANGLE_STRIP,0,4)}initDistanceDataFull(t,e){const i=this.gl,s=this.getProg("accumulate");i.useProgram(s.program),i.bindVertexArray(s.vao),this.isElastic?(this.textures.bindTexture(0,this.stateAPair[t]),this.textures.bindTexture(1,this.stateBPair[t]),this.uniforms.set1i(s.program,"u_stateTextureA",0),this.uniforms.set1i(s.program,"u_stateTextureB",1)):(this.textures.bindTexture(0,this.stateAPair[t]),this.uniforms.set1i(s.program,"u_stateTexture",0)),this.uniforms.set1b(s.program,"u_reset",!0),this.fb.attachColor(i.COLOR_ATTACHMENT0,this.dataPair[1]),i.drawBuffers([i.COLOR_ATTACHMENT0]),i.viewport(0,0,e,e),i.drawArrays(i.TRIANGLE_STRIP,0,4),[this.dataPair[0],this.dataPair[1]]=[this.dataPair[1],this.dataPair[0]]}stepPhysics(t,e,i,s,a){const r=this.gl,n=this.getProg("physics");r.useProgram(n.program),r.bindVertexArray(n.vao),this.isElastic?(this.textures.bindTexture(0,t[i]),this.textures.bindTexture(1,e[i]),this.uniforms.set1i(n.program,"u_stateTextureA",0),this.uniforms.set1i(n.program,"u_stateTextureB",1),this.uniforms.set1f(n.program,"u_k1",this.config.k1),this.uniforms.set1f(n.program,"u_k2",this.config.k2),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,null,0),this.fb.attachColor(r.COLOR_ATTACHMENT0,t[s]),this.fb.attachColor(r.COLOR_ATTACHMENT1,e[s]),r.drawBuffers([r.COLOR_ATTACHMENT0,r.COLOR_ATTACHMENT1])):(this.textures.bindTexture(0,t[i]),this.uniforms.set1i(n.program,"u_stateTexture",0),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,null,0),this.fb.attachColor(r.COLOR_ATTACHMENT0,t[s]),r.drawBuffers([r.COLOR_ATTACHMENT0])),this.setPhysicsUniforms(n.program),this.uniforms.set1f(n.program,"u_dt",this.config.dt),r.viewport(0,0,a,a),r.drawArrays(r.TRIANGLE_STRIP,0,4)}stepAccumulate(t,e,i,s,a,r,n){const l=this.gl,u=this.getProg("accumulate");l.useProgram(u.program),l.bindVertexArray(u.vao),this.isElastic?(this.textures.bindTexture(0,t[s]),this.textures.bindTexture(1,e[s]),this.textures.bindTexture(2,i[a]),this.uniforms.set1i(u.program,"u_stateTextureA",0),this.uniforms.set1i(u.program,"u_stateTextureB",1),this.uniforms.set1i(u.program,"u_distanceTexture",2),l.framebufferTexture2D(l.FRAMEBUFFER,l.COLOR_ATTACHMENT1,l.TEXTURE_2D,null,0)):(this.textures.bindTexture(0,t[s]),this.textures.bindTexture(1,i[a]),this.uniforms.set1i(u.program,"u_stateTexture",0),this.uniforms.set1i(u.program,"u_distanceTexture",1)),this.uniforms.set1b(u.program,"u_reset",!1),l.framebufferTexture2D(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,null,0),this.fb.attachColor(l.COLOR_ATTACHMENT0,i[r]),l.drawBuffers([l.COLOR_ATTACHMENT0]),l.viewport(0,0,n,n),l.drawArrays(l.TRIANGLE_STRIP,0,4)}initDivergenceFull(t,e){const i=this.gl,s=this.getProg("init");i.useProgram(s.program),i.bindVertexArray(s.vao),this.setPhaseSpaceUniforms(s.program),this.modeKey==="divergenceDistance"&&this.setPhysicsUniforms(s.program),this.setPerturbUniforms(s.program),this.uniforms.set2f(s.program,"u_chunkOffset",0,0),this.uniforms.set1f(s.program,"u_chunkScale",1),this.attachDivOutputs(t,!1),i.viewport(0,0,e,e),i.drawArrays(i.TRIANGLE_STRIP,0,4)}stepDivergeFull(t,e,i){const s=this.gl,a=this.getProg("divergeStep");s.useProgram(a.program),s.bindVertexArray(a.vao),this.bindDivInputs(t,!1),this.setDivUniforms(a.program,this.frameCount),this.uniforms.set2f(a.program,"u_chunkOffset",0,0),this.uniforms.set1f(a.program,"u_chunkScale",1),this.attachDivOutputs(e,!1),s.viewport(0,0,i,i),s.drawArrays(s.TRIANGLE_STRIP,0,4)}initChunk(t,e){const i=this.gl,s=this.config.chunkSize,a=this.getProg("init");i.useProgram(a.program),i.bindVertexArray(a.vao),this.setPhaseSpaceUniforms(a.program),this.modeKey==="divergenceDistance"&&this.setPhysicsUniforms(a.program),this.setPerturbUniforms(a.program),this.uniforms.set2f(a.program,"u_chunkOffset",t/this.chunksPerSide,e/this.chunksPerSide),this.uniforms.set1f(a.program,"u_chunkScale",1/this.chunksPerSide),this.attachDivOutputs(0,!0),i.viewport(0,0,s,s),i.drawArrays(i.TRIANGLE_STRIP,0,4),this.attachDivOutputs(1,!0),i.viewport(0,0,s,s),i.drawArrays(i.TRIANGLE_STRIP,0,4)}stepDivergeChunk(t,e){const i=this.gl,s=this.config.chunkSize,a=this.getProg("divergeStep");i.useProgram(a.program),i.bindVertexArray(a.vao),this.bindDivInputs(t,!0),this.setDivUniforms(a.program,this.chunkFrameCount),this.uniforms.set2f(a.program,"u_chunkOffset",0,0),this.uniforms.set1f(a.program,"u_chunkScale",1),this.attachDivOutputs(e,!0),i.viewport(0,0,s,s),i.drawArrays(i.TRIANGLE_STRIP,0,4)}blitToResult(t,e,i){const s=this.gl,a=this.config.chunkSize,r=e*this.chunksPerSide+t,n=this.getProg("blit");s.bindFramebuffer(s.FRAMEBUFFER,this.framebuffer),this.detachAll(),s.useProgram(n.program),s.bindVertexArray(n.vao),this.textures.bindTexture(0,i),this.uniforms.set1i(n.program,"u_src",0),this.fb.attachColor(s.COLOR_ATTACHMENT0,this.chunkResults[r]),s.drawBuffers([s.COLOR_ATTACHMENT0]),s.viewport(0,0,a,a),s.drawArrays(s.TRIANGLE_STRIP,0,4),this.chunkDone[r]=!0,s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindVertexArray(null)}attachDivOutputs(t,e){const i=this.gl,s=e?this.chunkStateAPair:this.stateAPair,a=e?this.chunkStateBPair:this.stateBPair,r=e?this.chunkPerturbedAPair:this.perturbedAPair,n=e?this.chunkPerturbedBPair:this.perturbedBPair,l=e?this.chunkDataPair:this.dataPair;this.isElastic?(this.fb.attachColor(i.COLOR_ATTACHMENT0,s[t]),this.fb.attachColor(i.COLOR_ATTACHMENT1,a[t]),this.fb.attachColor(i.COLOR_ATTACHMENT2,r[t]),this.fb.attachColor(i.COLOR_ATTACHMENT3,n[t]),this.fb.attachColor(i.COLOR_ATTACHMENT4,l[t]),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1,i.COLOR_ATTACHMENT2,i.COLOR_ATTACHMENT3,i.COLOR_ATTACHMENT4])):(this.fb.attachColor(i.COLOR_ATTACHMENT0,s[t]),this.fb.attachColor(i.COLOR_ATTACHMENT1,r[t]),this.fb.attachColor(i.COLOR_ATTACHMENT2,l[t]),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1,i.COLOR_ATTACHMENT2]))}bindDivInputs(t,e){this.gl;const i=this.getProg("divergeStep"),s=e?this.chunkStateAPair:this.stateAPair,a=e?this.chunkStateBPair:this.stateBPair,r=e?this.chunkPerturbedAPair:this.perturbedAPair,n=e?this.chunkPerturbedBPair:this.perturbedBPair,l=e?this.chunkDataPair:this.dataPair;this.isElastic?(this.textures.bindTexture(0,s[t]),this.textures.bindTexture(1,a[t]),this.textures.bindTexture(2,r[t]),this.textures.bindTexture(3,n[t]),this.textures.bindTexture(4,l[t]),this.uniforms.set1i(i.program,"u_baseTextureA",0),this.uniforms.set1i(i.program,"u_baseTextureB",1),this.uniforms.set1i(i.program,"u_pertTextureA",2),this.uniforms.set1i(i.program,"u_pertTextureB",3),this.uniforms.set1i(i.program,"u_divergenceTexture",4)):(this.textures.bindTexture(0,s[t]),this.textures.bindTexture(1,r[t]),this.textures.bindTexture(2,l[t]),this.uniforms.set1i(i.program,"u_stateTexture",0),this.uniforms.set1i(i.program,"u_perturbedTexture",1),this.uniforms.set1i(i.program,"u_divergenceTexture",2))}setDivUniforms(t,e){this.setPhysicsUniforms(t),this.uniforms.set1f(t,"u_dt",this.config.dt),this.uniforms.set1i(t,"u_currentIter",e)}setPhysicsUniforms(t){this.uniforms.set1f(t,"u_m1",this.config.m1),this.uniforms.set1f(t,"u_m2",this.config.m2),this.uniforms.set1f(t,"u_L1",this.config.L1),this.uniforms.set1f(t,"u_L2",this.config.L2),this.isElastic&&(this.uniforms.set1f(t,"u_k1",this.config.k1),this.uniforms.set1f(t,"u_k2",this.config.k2))}trialSeed(){return this.config.seed+this.currentTrial*1e3}setPerturbUniforms(t){this.uniforms.set1f(t,"u_perturb",this.config.perturb),this.uniforms.set1f(t,"u_seed",this.trialSeed()),this.uniforms.set1i(t,"u_perturbMode",this.config.perturbDistribution==="gaussian"?1:0)}startDivergence(t){this.onDivergenceRender=t,this.reset(),this.chunking?(this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.framebuffer),this.detachAll(),this.initChunk(0,0),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.bindVertexArray(null),this.animatingFirstChunk=!0):(this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.framebuffer),this.detachAll(),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.bindVertexArray(null))}stepDivergence(){if(this.complete)return;const t=20,e=this.gl;if(this.chunking){if(this.chunkFrameCount>=this.config.maxIter){if(this.finishChunkTrial(),this.currentTrial<this.trials)this.chunkFrameCount=0,this.chunkReadIndex=0,e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer),this.detachAll(),this.initChunk(this.currentChunkX,this.currentChunkY),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindVertexArray(null),this.animatingFirstChunk=!0;else{const i=this.multiTrial?this.chunkAccumPair[this.accumReadIndex]:this.chunkDataPair[this.chunkReadIndex];this.blitToResult(this.currentChunkX,this.currentChunkY,i),this.advanceChunk(),this.currentChunkY<this.chunksPerSide?this.startChunkTile():(this.animatingFirstChunk=!1,this.complete=!0)}return}e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer);for(let i=0;i<t&&this.chunkFrameCount<this.config.maxIter;i++){this.chunkFrameCount++,this.frameCount++;const s=this.chunkReadIndex,a=1-this.chunkReadIndex;this.stepDivergeChunk(s,a),this.chunkReadIndex=a}e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindVertexArray(null)}else{if(this.frameCount>=this.config.maxIter){this.multiTrial&&this.runBlend(this.accumPair,this.dataPair[this.readIndex],this.config.resolution,this.trialsCompleted),this.trialsCompleted++,this.currentTrial=this.trialsCompleted,this.currentTrial<this.trials?(this.frameCount=0,this.readIndex=0,e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer),this.detachAll(),this.initDivergenceFull(0,this.config.resolution),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindVertexArray(null)):this.complete=!0;return}e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer);for(let i=0;i<t&&this.frameCount<this.config.maxIter;i++){this.frameCount++;const s=this.readIndex,a=1-this.readIndex;this.stepDivergeFull(s,a,this.config.resolution),this.readIndex=a}e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindVertexArray(null)}}finishChunkTrial(){this.multiTrial&&this.runBlend(this.chunkAccumPair,this.chunkDataPair[this.chunkReadIndex],this.config.chunkSize,this.trialsCompleted),this.trialsCompleted++,this.currentTrial=this.trialsCompleted}startChunkTile(){this.currentTrial=0,this.trialsCompleted=0,this.accumReadIndex=0,this.chunkFrameCount=0,this.chunkReadIndex=0;const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer),this.detachAll(),this.initChunk(this.currentChunkX,this.currentChunkY),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindVertexArray(null),this.animatingFirstChunk=!0}runBlend(t,e,i,s){const a=this.gl,r=1-this.accumReadIndex,n=1/(s+1),l=this.getProg("blend");a.bindFramebuffer(a.FRAMEBUFFER,this.framebuffer),this.detachAll(),a.useProgram(l.program),a.bindVertexArray(l.vao),this.textures.bindTexture(0,t[this.accumReadIndex]),this.textures.bindTexture(1,e),this.uniforms.set1i(l.program,"u_accum",0),this.uniforms.set1i(l.program,"u_newTrial",1),this.uniforms.set1f(l.program,"u_weight",n),this.fb.attachColor(a.COLOR_ATTACHMENT0,t[r]),a.drawBuffers([a.COLOR_ATTACHMENT0]),a.viewport(0,0,i,i),a.drawArrays(a.TRIANGLE_STRIP,0,4),this.accumReadIndex=r,a.bindFramebuffer(a.FRAMEBUFFER,null),a.bindVertexArray(null)}advanceChunk(){this.currentChunkX++,this.currentChunkX>=this.chunksPerSide&&(this.currentChunkX=0,this.currentChunkY++)}getDataTexture(){return this.multiTrial&&this.trialsCompleted>0?this.accumPair[this.accumReadIndex]:this.dataPair[this.readIndex]}getFrameCount(){return this.multiTrial&&!this.chunking?this.trialsCompleted*this.config.maxIter+this.frameCount:this.frameCount}getTrialProgress(){return{current:Math.min(this.currentTrial+1,this.trials),total:this.trials}}isComplete(){return this.complete}dispose(){const t=this.gl;for(const[,i]of this.programs)t.deleteProgram(i.program),t.deleteVertexArray(i.vao);this.programs.clear(),t.deleteFramebuffer(this.framebuffer);const e=[];this.stateAPair&&e.push(this.stateAPair),this.stateBPair&&e.push(this.stateBPair),this.perturbedAPair&&e.push(this.perturbedAPair),this.perturbedBPair&&e.push(this.perturbedBPair),this.dataPair&&e.push(this.dataPair),this.chunkStateAPair&&e.push(this.chunkStateAPair),this.chunkStateBPair&&e.push(this.chunkStateBPair),this.chunkPerturbedAPair&&e.push(this.chunkPerturbedAPair),this.chunkPerturbedBPair&&e.push(this.chunkPerturbedBPair),this.chunkDataPair&&e.push(this.chunkDataPair),this.accumPair&&e.push(this.accumPair),this.chunkAccumPair&&e.push(this.chunkAccumPair);for(const i of e)t.deleteTexture(i[0]),t.deleteTexture(i[1]);for(const i of this.chunkResults)t.deleteTexture(i)}}const ut=`#version 300 es
precision highp float;

uniform sampler2D u_dataTexture;
uniform int u_colormap;
uniform int u_toneMapping;
uniform float u_maxValue;
uniform int u_vizMode;

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
    
    if (u_vizMode == 1) {
        value = data.r;
        if (value <= 0.0) {
            fragColor = vec4(1.0, 1.0, 1.0, 1.0);
            return;
        }
    } else if (u_vizMode == 2) {
        if (data.w < 0.5) {
            fragColor = vec4(1.0, 1.0, 1.0, 1.0);
            return;
        }
        value = data.z;
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
`;class ht{constructor(t,e,i,s,a){o(this,"maxValue",0);o(this,"program");o(this,"vao");this.gl=t,this.config=e,this.textures=i,this.uniforms=s;const n=new X(t).linkProgram(K,ut,"render");this.vao=t.createVertexArray(),t.bindVertexArray(this.vao),t.bindBuffer(t.ARRAY_BUFFER,a);const l=t.getAttribLocation(n.program,"a_position");l>=0&&(t.enableVertexAttribArray(l),t.vertexAttribPointer(l,2,t.FLOAT,!1,0,0)),t.bindVertexArray(null),this.program=n.program}render(t){this.renderAt(t,0,0,this.config.resolution,this.config.resolution)}renderAt(t,e,i,s,a){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,null),r.viewport(e,i,s,a),r.useProgram(this.program),r.bindVertexArray(this.vao),this.textures.bindTexture(0,t),this.uniforms.set1i(this.program,"u_dataTexture",0),this.uniforms.set1i(this.program,"u_colormap",this.config.colormap),this.uniforms.set1i(this.program,"u_toneMapping",this.config.toneMapping),this.uniforms.set1f(this.program,"u_maxValue",this.maxValue||1);const n=this.config.vizMode==="distance"?0:this.config.vizMode==="divergence"?1:2;this.uniforms.set1i(this.program,"u_vizMode",n),r.drawArrays(r.TRIANGLE_STRIP,0,4),r.bindVertexArray(null)}computeMaxValue(t){const e=this.config.vizMode==="divergence",i=e?0:2;let s=0;const a=this.gl,r=a.createFramebuffer();a.bindFramebuffer(a.FRAMEBUFFER,r),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,t,0);const n=128,l=new Float32Array(n*n*4);a.viewport(0,0,n,n),a.readPixels(0,0,n,n,a.RGBA,a.FLOAT,l);for(let u=0;u<l.length;u+=4){const c=l[u+i];c>s&&isFinite(c)&&(s=c)}a.deleteFramebuffer(r),a.bindFramebuffer(a.FRAMEBUFFER,null),this.maxValue=s}computeMaxValueFromChunks(t){const i=this.config.vizMode==="divergence"?0:2;let s=0;const a=this.gl,r=a.createFramebuffer();a.bindFramebuffer(a.FRAMEBUFFER,r);const n=128,l=new Float32Array(n*n*4);for(const u of t){a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,u,0),a.viewport(0,0,n,n),a.readPixels(0,0,n,n,a.RGBA,a.FLOAT,l);for(let c=0;c<l.length;c+=4){const p=l[c+i];p>s&&isFinite(p)&&(s=p)}}a.deleteFramebuffer(r),a.bindFramebuffer(a.FRAMEBUFFER,null),this.maxValue=s}getMaxValue(){return this.maxValue}}class V{constructor(t,e){o(this,"zoomHistory",[]);this.config=t,this.onZoomChange=e}get level(){return this.zoomHistory.length+1}applyRectangle(t,e,i,s,a,r){const n=Math.max(0,Math.min(1,Math.min(t,i)/a)),l=Math.max(0,Math.min(1,Math.max(t,i)/a)),u=Math.max(0,Math.min(1,1-Math.max(e,s)/r)),c=Math.max(0,Math.min(1,1-Math.min(e,s)/r)),p=this.config.phaseSpace.x.min+n*(this.config.phaseSpace.x.max-this.config.phaseSpace.x.min),d=this.config.phaseSpace.x.min+l*(this.config.phaseSpace.x.max-this.config.phaseSpace.x.min),f=this.config.phaseSpace.y.min+u*(this.config.phaseSpace.y.max-this.config.phaseSpace.y.min),m=this.config.phaseSpace.y.min+c*(this.config.phaseSpace.y.max-this.config.phaseSpace.y.min);this.zoomHistory.push({x:{...this.config.phaseSpace.x},y:{...this.config.phaseSpace.y}}),this.config.phaseSpace.x={dimension:this.config.phaseSpace.x.dimension,min:Math.min(p,d),max:Math.max(p,d)},this.config.phaseSpace.y={dimension:this.config.phaseSpace.y.dimension,min:Math.min(f,m),max:Math.max(f,m)},this.onZoomChange()}zoomOut(){if(this.zoomHistory.length>0){const t=this.zoomHistory.pop();this.config.phaseSpace.x=t.x,this.config.phaseSpace.y=t.y}else this.config.phaseSpace.x.min=-Math.PI,this.config.phaseSpace.x.max=Math.PI,this.config.phaseSpace.y.min=-Math.PI,this.config.phaseSpace.y.max=Math.PI;this.onZoomChange()}reset(){this.zoomHistory=[],this.config.phaseSpace.x.min=-Math.PI,this.config.phaseSpace.x.max=Math.PI,this.config.phaseSpace.y.min=-Math.PI,this.config.phaseSpace.y.max=Math.PI,this.onZoomChange()}}class ct{constructor(){o(this,"elements",{});this.cacheElements()}cacheElements(){const t=["systemType","vizMode","resolution","colormap","toneMapping","xDimension","yDimension","xMin","xMax","yMin","yMax","initAngle1","initVelocity1","initAngle2","initVelocity2","initStretch1","initStretchRate1","initStretch2","initStretchRate2","dt","iterations","maxIter","perturb","resetBtn","downloadBtn","zoomOutBtn","playBtn","modeIndicator","subtitle","legendGradient","frameCount","maxDistance","fps","zoomLevel","iterValue","perturbValue","m1Value","m2Value","L1Value","L2Value","k1Value","k2Value","elasticControls","maxIterControl","perturbControl","perturbModeControl","trialsControl","frameRow","maxDistRow","trialRow","trialCount"];for(const e of t){const i=document.getElementById(e);i&&(this.elements[e]=i)}}getElement(t){return this.elements[t]??document.getElementById(t)}getInputValue(t){const e=this.getElement(t);return e instanceof HTMLInputElement||e instanceof HTMLSelectElement?e.value:""}setInputValue(t,e){const i=this.getElement(t);(i instanceof HTMLInputElement||i instanceof HTMLSelectElement)&&(i.value=String(e))}setTextContent(t,e){const i=this.getElement(t);i&&(i.textContent=e)}setDisplay(t,e){const i=this.getElement(t);i&&(i.style.display=e)}updateModeUI(t){t.vizMode;const e=t.system!=="rigid",i=t.vizMode==="divergence",s=t.vizMode==="divergenceDistance",a=i||s;this.setDisplay("perturbControl",a?"block":"none"),this.setDisplay("perturbModeControl",a?"block":"none"),this.setDisplay("trialsControl",a?"block":"none"),this.setDisplay("elasticControls",e?"block":"none");const r=document.querySelectorAll(".elastic-only"),n=document.querySelectorAll(".elastic-initial");for(let u=0;u<r.length;u++)r[u].style.display=e?"block":"none";for(let u=0;u<n.length;u++)n[u].style.display=e?"block":"none";this.setTextContent("modeIndicator",`${at[t.system]} · ${rt[t.vizMode]}`);const l={distance:e?"Total distance traveled by bob2 (elastic system)":"Total distance traveled by the second pendulum bob",divergence:"Iterations until perturbed trajectory diverges",divergenceDistance:"Distance traveled by bob2 when trajectories diverge"};this.setTextContent("subtitle",l[t.vizMode]),this.setDisplay("frameRow",i?"none":"inline"),this.setDisplay("maxDistRow",i?"none":"inline"),this.ensureDistinctDimensions(t.phaseSpace.x.dimension,t.phaseSpace.y.dimension)}updateLegend(t){const e=this.getElement("legendGradient");e&&(e.style.background=t===6?"linear-gradient(90deg, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%))":"linear-gradient(90deg, rgb(68, 1, 84), rgb(33, 145, 140), rgb(253, 231, 37))")}updatePhaseSpaceInputs(t){this.setInputValue("xDimension",t.phaseSpace.x.dimension),this.setInputValue("xMin",t.phaseSpace.x.min.toFixed(2)),this.setInputValue("xMax",t.phaseSpace.x.max.toFixed(2)),this.setInputValue("yDimension",t.phaseSpace.y.dimension),this.setInputValue("yMin",t.phaseSpace.y.min.toFixed(2)),this.setInputValue("yMax",t.phaseSpace.y.max.toFixed(2));const e=t.phaseSpace.initialValues;this.setInputValue("initAngle1",e.angle1.toFixed(2)),this.setInputValue("initVelocity1",e.velocity1.toFixed(2)),this.setInputValue("initAngle2",e.angle2.toFixed(2)),this.setInputValue("initVelocity2",e.velocity2.toFixed(2)),this.setInputValue("initStretch1",e.stretch1.toFixed(2)),this.setInputValue("initStretchRate1",e.stretchRate1.toFixed(2)),this.setInputValue("initStretch2",e.stretch2.toFixed(2)),this.setInputValue("initStretchRate2",e.stretchRate2.toFixed(2))}updatePendulumParams(t){this.setInputValue("m1",t.m1),this.setTextContent("m1Value",t.m1.toFixed(1)),this.setInputValue("m2",t.m2),this.setTextContent("m2Value",t.m2.toFixed(1)),this.setInputValue("L1",t.L1),this.setTextContent("L1Value",t.L1.toFixed(1)),this.setInputValue("L2",t.L2),this.setTextContent("L2Value",t.L2.toFixed(1)),this.setInputValue("k1",t.k1),this.setTextContent("k1Value",String(t.k1)),this.setInputValue("k2",t.k2),this.setTextContent("k2Value",String(t.k2))}updateIntegrationInputs(t){this.setInputValue("dt",t.dt.toFixed(4)),this.setInputValue("iterations",t.iterationsPerFrame),this.setTextContent("iterValue",String(t.iterationsPerFrame)),this.setInputValue("maxIter",t.maxIter),this.setInputValue("perturb",t.perturb),this.setTextContent("perturbValue",t.perturb.toFixed(6)),this.setInputValue("perturbDistribution",t.perturbDistribution),this.setInputValue("trials",t.trials),this.setTextContent("trialsValue",String(t.trials))}updateTrialStats(t,e,i){this.setDisplay("trialRow",t?"inline":"none"),t&&this.setTextContent("trialCount",`${e}/${i}`)}updateStats(t,e,i,s){this.setTextContent("frameCount",String(t)),this.setTextContent("maxDistance",e.toFixed(2)),this.setTextContent("fps",String(i)),this.setTextContent("zoomLevel",String(s))}ensureDistinctDimensions(t,e){const i=this.getElement("xDimension"),s=this.getElement("yDimension");if(!(!i||!s)){for(let a=0;a<i.options.length;a++){const r=i.options[a];r.disabled=r.value===e}for(let a=0;a<s.options.length;a++){const r=s.options[a];r.disabled=r.value===t}}}bindControl(t,e,i="input"){const s=this.getElement(t);s&&(i==="input"&&(s instanceof HTMLInputElement||s instanceof HTMLSelectElement)?s.addEventListener("input",()=>e(s.value)):s.addEventListener("change",()=>e(this.getInputValue(t))))}bindButton(t,e){const i=this.getElement(t);i&&i.addEventListener("click",e)}updateChunkSizeOptions(t){const e=this.getElement("chunkSize");if(!e)return;for(let s=0;s<e.options.length;s++){const a=e.options[s],r=parseInt(a.value);a.disabled=r>t}if(parseInt(e.value)>t){const s=Array.from(e.options).filter(a=>!a.disabled);if(s.length>0){const a=s[s.length-1];e.value=a.value}}}}class dt{constructor(){o(this,"lastTime",performance.now());o(this,"fps",0)}update(t,e,i,s){const a=performance.now();t.vizMode==="divergence"&&s?this.fps=0:this.fps=Math.round(1e3/(a-this.lastTime)),this.lastTime=a}getFps(){return this.fps}}function q(h){const t=h.length;if(t<=1)return[{re:h[0]||0,im:0}];if(t%2!==0)throw new Error("FFT length must be power of 2");const e=new Float64Array(t/2),i=new Float64Array(t/2);for(let n=0;n<t/2;n++)e[n]=h[2*n],i[n]=h[2*n+1];const s=q(e),a=q(i),r=new Array(t);for(let n=0;n<t/2;n++){const l=-2*Math.PI*n/t,u={re:Math.cos(l)*a[n].re-Math.sin(l)*a[n].im,im:Math.cos(l)*a[n].im+Math.sin(l)*a[n].re};r[n]={re:s[n].re+u.re,im:s[n].im+u.im},r[n+t/2]={re:s[n].re-u.re,im:s[n].im-u.im}}return r}function ft(h){const t=h.length,e=Math.floor(t/2)+1,i=new Float64Array(e);for(let s=0;s<e;s++)i[s]=Math.sqrt(h[s].re*h[s].re+h[s].im*h[s].im);return i}function mt(h){return Math.pow(2,Math.ceil(Math.log2(h)))}function pt(h){const t=mt(h.length);if(t===h.length)return h;const e=new Float64Array(t);return e.set(h),e}function gt(h){const t=h.length,e=new Float64Array(t);for(let i=0;i<t;i++){const s=.5*(1-Math.cos(2*Math.PI*i/(t-1)));e[i]=h[i]*s}return e}class bt{constructor(t,e,i){o(this,"t1History");o(this,"w1History");o(this,"t2History");o(this,"w2History");o(this,"writeIdx",0);o(this,"filled",!1);o(this,"sampleRate");this.maxSamples=t,this.t1History=new Float64Array(t),this.w1History=new Float64Array(t),this.t2History=new Float64Array(t),this.w2History=new Float64Array(t),this.sampleRate=1/(e*i)}reset(){this.writeIdx=0,this.filled=!1}addSample(t,e,i,s){this.t1History[this.writeIdx]=t,this.w1History[this.writeIdx]=e,this.t2History[this.writeIdx]=i,this.w2History[this.writeIdx]=s,this.writeIdx++,this.writeIdx>=this.maxSamples&&(this.writeIdx=0,this.filled=!0)}analyze(){const t=this.filled?this.maxSamples:this.writeIdx;if(t<256)return{isPeriodic:!1,period:null,confidence:0,dominantFreq:null};const e=this.filled?this.t1History:this.t1History.subarray(0,t),i=this.filled?this.w1History:this.w1History.subarray(0,t),s=this.filled?this.t2History:this.t2History.subarray(0,t),a=this.filled?this.w2History:this.w2History.subarray(0,t),r=[this.analyzeDimension(e,"theta1"),this.analyzeDimension(i,"omega1"),this.analyzeDimension(s,"theta2"),this.analyzeDimension(a,"omega2")],n=r.reduce((d,f)=>d.confidence>f.confidence?d:f),l=r.filter(d=>d.isPeriodic).length,u=r.reduce((d,f)=>d+f.confidence,0)/r.length,c=n.confidence>.3&&(l>=2||n.confidence>.6),p=Math.min(1,n.confidence*.7+u*.3);return{isPeriodic:c,period:c?n.period:null,confidence:p,dominantFreq:c?n.dominantFreq:null}}analyzeDimension(t,e){const i=t.reduce((x,y)=>x+y,0)/t.length,s=new Float64Array(t.length);for(let x=0;x<t.length;x++)s[x]=t[x]-i;const a=gt(s),r=pt(a),n=ft(q(r)),l=n.length,u=this.findSpectrumPeaks(n,l);if(u.length===0)return{isPeriodic:!1,period:null,confidence:0,dominantFreq:null};const c=u[0],p=this.sampleRate/r.length,d=c.bin*p,f=d>0?1/d:null,m=n.reduce((x,y)=>x+y*y,0),v=c.height*c.height,g=m>0?v/m:0,_=Math.min(1,g*3+c.prominence*.5);return{isPeriodic:_>.25&&c.prominence>.3,period:f,confidence:_,dominantFreq:d}}findSpectrumPeaks(t,e){const i=[],a=e-1;for(let r=2;r<a;r++)if(t[r]>t[r-1]&&t[r]>t[r+1]){const l=Math.min(...Array.from({length:5},(d,f)=>t[Math.max(0,r-f-1)])),u=Math.min(...Array.from({length:5},(d,f)=>t[Math.min(e-1,r+f+1)])),c=Math.max(l,u),p=t[r]-c;p>0&&i.push({bin:r,height:t[r],prominence:p/t[r]})}return i.sort((r,n)=>n.height-r.height),i.slice(0,3)}}class vt{constructor(t,e,i=1e3){o(this,"canvas");o(this,"ctx");o(this,"poincareCanvas");o(this,"poincareCtx");o(this,"data");o(this,"maxPoints");o(this,"width");o(this,"height");o(this,"phaseSpaceHistory",[]);o(this,"poincarePoints",[]);o(this,"kineticEnergyHistory",[]);o(this,"keThreshold",null);o(this,"lastKeState",null);o(this,"framesSinceReset",0);o(this,"ANALYSIS_FRAMES",300);o(this,"hasAnalyzed",!1);o(this,"colors",{theta1:"rgba(100, 200, 255, 0.85)",theta2:"rgba(255, 150, 100, 0.85)",omega1:"rgba(150, 255, 150, 0.85)",omega2:"rgba(255, 255, 100, 0.85)",kineticEnergy:"rgba(255, 100, 100, 0.85)",potentialEnergy:"rgba(100, 100, 255, 0.85)",elasticEnergy:"rgba(255, 200, 100, 0.85)"});o(this,"labels",{theta1:"θ₁",theta2:"θ₂",omega1:"ω₁",omega2:"ω₂",kineticEnergy:"KE",potentialEnergy:"PE",elasticEnergy:"EE"});this.canvas=t,this.ctx=t.getContext("2d"),this.poincareCanvas=e,this.poincareCtx=e.getContext("2d"),this.maxPoints=i,this.width=t.width,this.height=t.height,this.data={theta1:[],omega1:[],theta2:[],omega2:[],kineticEnergy:[],potentialEnergy:[],elasticEnergy:[]}}reset(){this.data={theta1:[],omega1:[],theta2:[],omega2:[],kineticEnergy:[],potentialEnergy:[],elasticEnergy:[]},this.phaseSpaceHistory=[],this.poincarePoints=[],this.kineticEnergyHistory=[],this.keThreshold=null,this.lastKeState=null,this.framesSinceReset=0,this.hasAnalyzed=!1}addPoint(t,e,i,s,a,r,n){this.data.theta1.push(t),this.data.omega1.push(e),this.data.theta2.push(i),this.data.omega2.push(s),this.data.kineticEnergy.push(a),this.data.potentialEnergy.push(r),this.data.elasticEnergy.push(n),this.phaseSpaceHistory.push([t,e,i,s]),this.kineticEnergyHistory.push(a),this.data.theta1.length>this.maxPoints&&(this.data.theta1.shift(),this.data.omega1.shift(),this.data.theta2.shift(),this.data.omega2.shift(),this.data.kineticEnergy.shift(),this.data.potentialEnergy.shift(),this.data.elasticEnergy.shift()),this.phaseSpaceHistory.length>1e4&&(this.phaseSpaceHistory.shift(),this.kineticEnergyHistory.shift()),this.framesSinceReset++,!this.hasAnalyzed&&this.framesSinceReset>=this.ANALYSIS_FRAMES&&this.analyzeKineticEnergy(),this.keThreshold!==null&&this.checkPoincareCrossing()}analyzeKineticEnergy(){if(this.kineticEnergyHistory.length===0)return;const t=this.kineticEnergyHistory.slice(-this.ANALYSIS_FRAMES),e=t.reduce((s,a)=>s+a,0)/t.length;this.keThreshold=e,this.hasAnalyzed=!0;const i=this.kineticEnergyHistory[this.kineticEnergyHistory.length-1];this.lastKeState=i>=e?"above":"below",this.poincarePoints=[];for(let s=1;s<this.kineticEnergyHistory.length;s++){const a=this.kineticEnergyHistory[s-1],r=this.kineticEnergyHistory[s],n=a>=e?"above":"below",l=r>=e?"above":"below";if(n!==l){const u=Math.abs(a-e)/Math.abs(r-a),c=this.phaseSpaceHistory[s-1],p=this.phaseSpaceHistory[s],d=c.map((f,m)=>f+u*(p[m]-f));this.poincarePoints.push({x:d[0],y:d[1]})}}}checkPoincareCrossing(){if(this.keThreshold===null||this.kineticEnergyHistory.length<2)return;const t=this.kineticEnergyHistory.length,e=this.kineticEnergyHistory[t-2],i=this.kineticEnergyHistory[t-1],s=e>=this.keThreshold?"above":"below",a=i>=this.keThreshold?"above":"below";if(s!==a){const r=Math.abs(e-this.keThreshold)/Math.abs(i-e),n=this.phaseSpaceHistory[t-2],l=this.phaseSpaceHistory[t-1],u=n.map((c,p)=>c+r*(l[p]-c));this.poincarePoints.push({x:u[0],y:u[1]})}this.lastKeState=a}draw(t,e,i,s,a){const r=this.ctx,n=this.width,l=this.height;r.clearRect(0,0,n,l),r.fillStyle="rgba(8, 10, 16, 0.95)",r.fillRect(0,0,n,l);const u=this.data.theta1.length;if(u<2)return;const c=[this.data.theta1,this.data.omega1,this.data.theta2,this.data.omega2,this.data.kineticEnergy,this.data.potentialEnergy],p=[this.colors.theta1,this.colors.omega1,this.colors.theta2,this.colors.omega2,this.colors.kineticEnergy,this.colors.potentialEnergy],d=[this.labels.theta1,this.labels.omega1,this.labels.theta2,this.labels.omega2,this.labels.kineticEnergy,this.labels.potentialEnergy];t&&(c.push(this.data.elasticEnergy),p.push(this.colors.elasticEnergy),d.push(this.labels.elasticEnergy));const f=c.map(g=>this.getScaleRange([g]));r.strokeStyle="rgba(100, 100, 100, 0.1)",r.lineWidth=.5;for(let g=0;g<=4;g++){const _=l/4*g;r.beginPath(),r.moveTo(0,_),r.lineTo(n,_),r.stroke()}for(let g=0;g<c.length;g++)this.drawSingleLine(c[g],p[g],f[g],0,l,u);i!=null&&i<u&&this.drawVerticalMarker(i,u,n,l,"#0d4","Start"),s!=null&&s<u&&this.drawVerticalMarker(s,u,n,l,"#e84","End"),a!=null&&a<u&&this.drawVerticalMarker(a,u,n,l,"#e8a030","Divergence"),e!==void 0&&e<u&&this.drawVerticalMarker(e,u,n,l,"rgba(255, 255, 255, 0.3)","",!0),r.font="500 10px monospace",r.textAlign="left";let m=4;const v=12;for(let g=0;g<c.length;g++){const _=p[g],A=d[g],x=c[g][u-1];r.fillStyle=_,r.fillText(`${A} ${(x==null?void 0:x.toFixed(2))??""}`,m,v);const y=r.measureText(`${A} ${(x==null?void 0:x.toFixed(2))??""}`).width;m+=y+12}this.poincarePoints.length>0&&(r.fillStyle="rgba(255, 255, 255, 0.5)",r.fillText(`Poincaré: ${this.poincarePoints.length}`,m,v))}drawVerticalMarker(t,e,i,s,a,r,n=!1){const l=this.ctx,u=t/(e-1)*i;l.strokeStyle=a,l.lineWidth=n?1:2,l.setLineDash(n?[4,4]:[]),l.beginPath(),l.moveTo(u,0),l.lineTo(u,s),l.stroke(),l.setLineDash([]),r&&!n&&(l.fillStyle=a,l.font="500 9px monospace",l.textAlign="left",l.fillText(r,u+4,20))}drawPoincare(){var d;const t=this.poincareCtx,e=this.poincareCanvas.width,i=this.poincareCanvas.height;if(t.clearRect(0,0,e,i),t.fillStyle="rgba(8, 10, 16, 0.95)",t.fillRect(0,0,e,i),!this.hasAnalyzed){t.fillStyle="rgba(150, 150, 150, 0.5)",t.font="500 12px monospace",t.textAlign="center",t.fillText("Collecting data for Poincaré section...",e/2,i/2);return}if(this.poincarePoints.length===0){t.fillStyle="rgba(150, 150, 150, 0.5)",t.font="500 12px monospace",t.textAlign="center",t.fillText("No Poincaré crossings yet...",e/2,i/2);return}let s=1/0,a=-1/0,r=1/0,n=-1/0;for(const f of this.poincarePoints)f.x<s&&(s=f.x),f.x>a&&(a=f.x),f.y<r&&(r=f.y),f.y>n&&(n=f.y);const l=(a-s)*.1||1,u=(n-r)*.1||1;s-=l,a+=l,r-=u,n+=u;const c=a-s,p=n-r;if(!(c===0||p===0)){t.strokeStyle="rgba(100, 100, 100, 0.3)",t.lineWidth=.5,t.beginPath(),t.moveTo(0,i/2),t.lineTo(e,i/2),t.stroke(),t.beginPath(),t.moveTo(e/2,0),t.lineTo(e/2,i),t.stroke();for(const f of this.poincarePoints){const m=(f.x-s)/c*e,v=i-(f.y-r)/p*i;t.beginPath(),t.arc(m,v,3,0,Math.PI*2),t.fillStyle="rgba(255, 200, 100, 0.8)",t.fill()}t.fillStyle="rgba(255, 255, 255, 0.5)",t.font="500 10px monospace",t.textAlign="left",t.fillText(`Poincaré Section: KE = ${(d=this.keThreshold)==null?void 0:d.toFixed(2)} (${this.poincarePoints.length} points)`,10,20)}}getScaleRange(t){let e=1/0,i=-1/0;for(const r of t)for(const n of r)!isNaN(n)&&isFinite(n)&&(n<e&&(e=n),n>i&&(i=n));if(e===1/0)return{min:-1,max:1};const s=i-e,a=s===0?1:s*.1;return{min:e-a,max:i+a}}drawSingleLine(t,e,i,s,a,r){const n=this.ctx,l=this.width,u=i.max-i.min;if(u===0||!isFinite(u))return;n.beginPath(),n.strokeStyle=e,n.lineWidth=1.5;let c=!1;for(let p=0;p<r;p++){const d=t[p];if(!isFinite(d))continue;const f=p/(r-1)*l,m=(d-i.min)/u,v=s+a-m*a;c?n.lineTo(f,v):(n.moveTo(f,v),c=!0)}c&&n.stroke()}resize(t,e){this.canvas.width=t,this.canvas.height=e,this.width=t,this.height=e}}function xt(h){const t=Math.ceil(Math.sqrt(h));return{width:t,height:t}}function yt(h,t){return t==="rigid"?{a:new Float32Array([h.angle1,h.velocity1,h.angle2,h.velocity2]),b:null}:{a:new Float32Array([h.angle1,h.velocity1,h.stretch1,h.stretchRate1]),b:new Float32Array([h.angle2,h.velocity2,h.stretch2,h.stretchRate2])}}function _t(h,t,e){return e==="rigid"?{angle1:h[0],velocity1:h[1],angle2:h[2],velocity2:h[3],stretch1:0,stretchRate1:0,stretch2:0,stretchRate2:0}:{angle1:h[0],velocity1:h[1],stretch1:h[2],stretchRate1:h[3],angle2:t[0],velocity2:t[1],stretch2:t[2],stretchRate2:t[3]}}function W(h,t){const e=h-t;return e-2*Math.PI*Math.floor(e/(2*Math.PI)+.5)}function At(h,t,e){const i=W(h.angle1,t.angle1),s=W(h.angle2,t.angle2),a=h.velocity1-t.velocity1,r=h.velocity2-t.velocity2;if(e==="rigid")return Math.sqrt(i*i+a*a+s*s+r*r);const n=h.stretch1-t.stretch1,l=h.stretchRate1-t.stretchRate1,u=h.stretch2-t.stretch2,c=h.stretchRate2-t.stretchRate2;return Math.sqrt(i*i+a*a+n*n+l*l+s*s+r*r+u*u+c*c)}class Tt{constructor(t,e){o(this,"gl");o(this,"config");o(this,"systemKey");o(this,"quadBuf");o(this,"fb");o(this,"batchInitProg");o(this,"batchPhysicsProg");o(this,"texAPair");o(this,"texBPair",null);o(this,"texWidth",1);o(this,"texHeight",1);o(this,"logs",[]);o(this,"onLog");o(this,"onProgress");o(this,"isRunning",!1);o(this,"shouldStop",!1);o(this,"seedState",null);o(this,"bestResidual",1/0);o(this,"bestState",null);o(this,"cloudSize",16);o(this,"periodFrames",0);this.gl=t,this.config=e,this.systemKey=e.system==="rigid"?"rigid":e.system==="nonlinear"?"nonlinear":"elastic",this.quadBuf=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quadBuf),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),this.fb=t.createFramebuffer(),this.texAPair=this.makePair(1,1),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&(this.texBPair=this.makePair(1,1)),this.batchInitProg=this.buildProg(M.buildBatchInit(this.systemKey)),this.batchPhysicsProg=this.buildProg(M.buildBatchPhysics(this.systemKey))}setCloudSize(t){this.cloudSize=t}setOnLog(t){this.onLog=t}setOnProgress(t){this.onProgress=t}getLogs(){return[...this.logs]}getBestState(){return this.bestState}getBestResidual(){return this.bestResidual}isActive(){return this.isRunning}pause(){this.shouldStop=!0}resume(){this.shouldStop=!1,!this.isRunning&&this.seedState&&this.runOptimizationLoop()}makeTex(t,e){const i=this.gl,s=i.createTexture();return i.bindTexture(i.TEXTURE_2D,s),i.texImage2D(i.TEXTURE_2D,0,i.RGBA32F,t,e,0,i.RGBA,i.FLOAT,null),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.NEAREST),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),s}makePair(t,e){return[this.makeTex(t,e),this.makeTex(t,e)]}resizeTextures(t,e){const i=this.gl;i.deleteTexture(this.texAPair[0]),i.deleteTexture(this.texAPair[1]),this.texAPair=this.makePair(t,e),this.texBPair&&(i.deleteTexture(this.texBPair[0]),i.deleteTexture(this.texBPair[1]),this.texBPair=this.makePair(t,e)),this.texWidth=t,this.texHeight=e}buildProg(t){const i=new X(this.gl).linkProgram(K,t,"batch"),s=this.gl.createVertexArray();this.gl.bindVertexArray(s),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.quadBuf);const a=this.gl.getAttribLocation(i.program,"a_position");return a>=0&&(this.gl.enableVertexAttribArray(a),this.gl.vertexAttribPointer(a,2,this.gl.FLOAT,!1,0,0)),this.gl.bindVertexArray(null),{program:i.program,vao:s}}use(t){return this.gl.useProgram(t.program),this.gl.bindVertexArray(t.vao),t.program}u(t,e){const i=this.gl.getUniformLocation(t,e);if(!i)throw new Error(`uniform not found: ${e}`);return i}bind(t,e){this.gl.activeTexture(this.gl.TEXTURE0+t),this.gl.bindTexture(this.gl.TEXTURE_2D,e)}runBatchInit(t,e,i){const s=this.gl,a=this.use(this.batchInitProg),{a:r,b:n}=yt(t,this.config.system);this.systemKey==="rigid"?s.uniform4f(this.u(a,"u_seedState"),r[0],r[1],r[2],r[3]):(s.uniform4f(this.u(a,"u_seedA"),r[0],r[1],r[2],r[3]),s.uniform4f(this.u(a,"u_seedB"),n[0],n[1],n[2],n[3])),s.uniform1f(this.u(a,"u_perturbScale"),e),s.uniform1f(this.u(a,"u_seed"),i),s.bindFramebuffer(s.FRAMEBUFFER,this.fb);for(let l=0;l<5;l++)s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+l,s.TEXTURE_2D,null,0);this.systemKey==="elastic"||this.systemKey==="nonlinear"?(s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,this.texAPair[0],0),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT1,s.TEXTURE_2D,this.texBPair[0],0),s.drawBuffers([s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1])):(s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,this.texAPair[0],0),s.drawBuffers([s.COLOR_ATTACHMENT0])),s.viewport(0,0,this.texWidth,this.texHeight),s.drawArrays(s.TRIANGLE_STRIP,0,4),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindVertexArray(null)}runBatchPhysics(t,e,i){const s=this.gl,a=1-t,r=this.use(this.batchPhysicsProg);s.uniform1f(this.u(r,"u_dt"),i),s.uniform1i(this.u(r,"u_steps"),e),s.uniform1f(this.u(r,"u_m1"),this.config.m1),s.uniform1f(this.u(r,"u_m2"),this.config.m2),s.uniform1f(this.u(r,"u_L1"),this.config.L1),s.uniform1f(this.u(r,"u_L2"),this.config.L2),s.bindFramebuffer(s.FRAMEBUFFER,this.fb);for(let n=0;n<5;n++)s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+n,s.TEXTURE_2D,null,0);return this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.bind(0,this.texAPair[t]),this.bind(1,this.texBPair[t]),s.uniform1i(this.u(r,"u_stateTextureA"),0),s.uniform1i(this.u(r,"u_stateTextureB"),1),s.uniform1f(this.u(r,"u_k1"),this.config.k1),s.uniform1f(this.u(r,"u_k2"),this.config.k2),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,this.texAPair[a],0),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT1,s.TEXTURE_2D,this.texBPair[a],0),s.drawBuffers([s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1])):(this.bind(0,this.texAPair[t]),s.uniform1i(this.u(r,"u_stateTexture"),0),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,this.texAPair[a],0),s.drawBuffers([s.COLOR_ATTACHMENT0])),s.viewport(0,0,this.texWidth,this.texHeight),s.drawArrays(s.TRIANGLE_STRIP,0,4),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindVertexArray(null),a}readBackStates(t){const e=this.gl,i=this.texWidth*this.texHeight,s=new Float32Array(i*4),a=this.systemKey==="rigid"?null:new Float32Array(i*4);e.bindFramebuffer(e.FRAMEBUFFER,this.fb),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texAPair[t],0),e.drawBuffers([e.COLOR_ATTACHMENT0]),e.readBuffer(e.COLOR_ATTACHMENT0),e.readPixels(0,0,this.texWidth,this.texHeight,e.RGBA,e.FLOAT,s),a&&(e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texBPair[t],0),e.drawBuffers([e.COLOR_ATTACHMENT0]),e.readBuffer(e.COLOR_ATTACHMENT0),e.readPixels(0,0,this.texWidth,this.texHeight,e.RGBA,e.FLOAT,a)),e.bindFramebuffer(e.FRAMEBUFFER,null);const r=[];for(let n=0;n<i;n++){const l=new Float32Array(s.buffer,n*4*4,4),u=a?new Float32Array(a.buffer,n*4*4,4):null;r.push(_t(l,u,this.config.system))}return{states:r,aData:s,bData:a}}async startOptimization(t,e){if(this.isRunning)return;this.isRunning=!0,this.shouldStop=!1,this.seedState={...t},this.bestState={...t},this.bestResidual=1/0,this.logs=[],this.periodFrames=e;const i=xt(this.cloudSize);this.resizeTextures(i.width,i.height),await this.runOptimizationLoop()}async runOptimizationLoop(){if(!this.seedState)return;let t=.01,e=this.config.dt,i=1,s=0,a=0;const r=15,n=200;for(;this.isRunning&&a<n;){if(this.shouldStop){await new Promise(A=>setTimeout(A,100));continue}a++;const l=Math.floor(this.periodFrames*r*i),u=a*1.618;this.runBatchInit(this.seedState,t,u);let c=0;c=this.runBatchPhysics(c,l,e);const{states:p}=this.readBackStates(c),{states:d}=this.readBackStates(0),f=[];let m=1/0,v=0;for(let A=0;A<this.cloudSize;A++){const x=At(d[A],p[A],this.config.system);f.push(x),x<m&&(m=x,v=A)}const g=m<this.bestResidual;g?(this.bestResidual=m,this.bestState={...d[v]},this.seedState={...d[v]},s=0):s++;const _={cycle:a,bestResidual:m,perturbScale:t,dt:e,numPeriods:i,newBest:g,residuals:f.slice(0,this.cloudSize)};if(this.logs.push(_),this.onLog&&this.onLog(_),this.onProgress&&this.onProgress(a,this.bestResidual),s>=3&&(t*=.8,e*=.8,i+=1,s=0),t<1e-9||a>=n)break;await new Promise(A=>setTimeout(A,10))}this.isRunning=!1}dispose(){this.pause();const t=this.gl;t.deleteProgram(this.batchInitProg.program),t.deleteVertexArray(this.batchInitProg.vao),t.deleteProgram(this.batchPhysicsProg.program),t.deleteVertexArray(this.batchPhysicsProg.vao),t.deleteFramebuffer(this.fb),t.deleteBuffer(this.quadBuf),t.deleteTexture(this.texAPair[0]),t.deleteTexture(this.texAPair[1]),this.texBPair&&(t.deleteTexture(this.texBPair[0]),t.deleteTexture(this.texBPair[1]))}}const $={angle1:0,velocity1:1,stretch1:2,stretchRate1:3,angle2:4,velocity2:5,stretch2:6,stretchRate2:7};class St{constructor(t,e,i,s){o(this,"gl");o(this,"ctx");o(this,"graphCtx");o(this,"poincareCtx");o(this,"drawCanvas");o(this,"graphCanvas");o(this,"poincareCanvas");o(this,"config");o(this,"systemKey");o(this,"quadBuf");o(this,"fb");o(this,"baseAPair");o(this,"baseBPair",null);o(this,"pertAPair");o(this,"pertBPair",null);o(this,"initProg");o(this,"physicsProg");o(this,"readIdx",0);o(this,"trail",[]);o(this,"diverged",!1);o(this,"active",!1);o(this,"simulating",!1);o(this,"animId",null);o(this,"debounceTimer",null);o(this,"baseSA",new Float32Array(4));o(this,"baseSB",null);o(this,"pertSA",new Float32Array(4));o(this,"pertSB",null);o(this,"boxMargin",0);o(this,"boxSize",500);o(this,"armScale",110);o(this,"freqAnalyzer");o(this,"lastAnalysis",null);o(this,"analysisFrameSkip",0);o(this,"phaseSpaceGraph");o(this,"previewEnabled",!1);o(this,"previewBtn");o(this,"previewStatus");o(this,"optimizeBtn");o(this,"isOptimizing",!1);o(this,"trajectoryHistory",[]);o(this,"playbackControls");o(this,"playPauseBtn");o(this,"scrubber");o(this,"timeDisplay");o(this,"setStartBtn");o(this,"setEndBtn");o(this,"periodSelection");o(this,"isPlaying",!0);o(this,"currentFrame",0);o(this,"startFrame",null);o(this,"endFrame",null);o(this,"divergenceFrame",null);o(this,"onConfigChange");o(this,"optimizer",null);o(this,"optimizerConsole");o(this,"cloudSizeSelect");o(this,"pauseResumeBtn");o(this,"seedPreviewCanvas");o(this,"seedPreviewCtx");o(this,"seedPlayPauseBtn");o(this,"seedIsPlaying",!0);o(this,"seedAnimId",null);o(this,"seedState",null);o(this,"seedTrail",[]);o(this,"seedFrame",0);o(this,"seedReadIdx",0);o(this,"seedAPair");o(this,"seedBPair",null);o(this,"seedSA",new Float32Array(4));o(this,"seedSB",null);this.mainCanvas=e,this.config=s,this.systemKey=s.system==="rigid"?"rigid":s.system==="nonlinear"?"nonlinear":"elastic",this.gl=i,this.drawCanvas=document.getElementById("previewCanvas"),this.ctx=this.drawCanvas.getContext("2d"),this.graphCanvas=document.getElementById("graphCanvas"),this.graphCtx=this.graphCanvas.getContext("2d"),this.poincareCanvas=document.getElementById("poincareCanvas"),this.poincareCtx=this.poincareCanvas.getContext("2d"),this.phaseSpaceGraph=new vt(this.graphCanvas,this.poincareCanvas,1e3),this.previewBtn=document.getElementById("previewToggleBtn"),this.previewStatus=document.getElementById("previewStatus"),this.previewBtn.addEventListener("click",()=>this.togglePreview()),this.optimizeBtn=document.getElementById("optimizeBtn"),this.optimizeBtn.addEventListener("click",()=>this.startOptimization()),this.optimizerConsole=document.getElementById("optimizerConsole"),this.cloudSizeSelect=document.getElementById("cloudSizeSelect"),this.pauseResumeBtn=document.getElementById("pauseResumeBtn"),this.pauseResumeBtn.addEventListener("click",()=>this.toggleOptimizerPause()),this.seedPreviewCanvas=document.getElementById("seedPreviewCanvas"),this.seedPreviewCtx=this.seedPreviewCanvas.getContext("2d"),this.seedPlayPauseBtn=document.getElementById("seedPlayPauseBtn"),this.seedPlayPauseBtn.addEventListener("click",()=>this.toggleSeedPlayPause()),this.syncSize();const a=document.getElementById("clearSavedBtn");a&&a.addEventListener("click",()=>{localStorage.removeItem("chaoticPendulums_saved"),this.updateSavedPendulumsList()}),this.updateSavedPendulumsList(),this.playbackControls=document.getElementById("playbackControls"),this.playPauseBtn=document.getElementById("playPauseBtn"),this.scrubber=document.getElementById("scrubber"),this.timeDisplay=document.getElementById("timeDisplay"),this.setStartBtn=document.getElementById("setStartBtn"),this.setEndBtn=document.getElementById("setEndBtn"),this.periodSelection=document.getElementById("periodSelection"),this.playPauseBtn.addEventListener("click",()=>this.togglePlayPause()),this.scrubber.addEventListener("input",()=>this.onScrub()),this.setStartBtn.addEventListener("click",()=>this.setStartPoint()),this.setEndBtn.addEventListener("click",()=>this.setEndPoint()),this.quadBuf=i.createBuffer(),i.bindBuffer(i.ARRAY_BUFFER,this.quadBuf),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),i.STATIC_DRAW),this.fb=i.createFramebuffer(),this.baseAPair=this.makePair(),this.pertAPair=this.makePair(),this.seedAPair=this.makePair(),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&(this.baseBPair=this.makePair(),this.pertBPair=this.makePair(),this.seedBPair=this.makePair(),this.baseSB=new Float32Array(4),this.pertSB=new Float32Array(4),this.seedSB=new Float32Array(4)),this.initProg=this.buildProg(M.buildPreviewInit(this.systemKey)),this.physicsProg=this.buildProg(M.buildPreviewPhysicsLoop(this.systemKey)),this.freqAnalyzer=new bt(2048,this.config.dt,15),this.mainCanvas.addEventListener("click",r=>{if(this.previewEnabled){const n=this.mainCanvas.getBoundingClientRect(),l=(r.clientX-n.left)*(this.mainCanvas.width/n.width),u=(r.clientY-n.top)*(this.mainCanvas.height/n.height);this.onClick(l,u)}}),new ResizeObserver(()=>this.syncSize()).observe(t)}syncSize(){const t=this.boxSize+2*this.boxMargin;this.drawCanvas.width=t,this.drawCanvas.height=500,this.graphCanvas.width=t,this.graphCanvas.height=200,this.phaseSpaceGraph.resize(t,200),this.seedPreviewCanvas.width=t,this.seedPreviewCanvas.height=500}togglePreview(){this.previewEnabled=!this.previewEnabled,this.previewEnabled?(this.previewBtn.textContent="✕ Stop",this.previewBtn.style.background="#3a2020",this.previewStatus.textContent="Click on the main canvas to start simulation",this.previewStatus.style.color="#888",this.isPlaying=!0,this.playPauseBtn.textContent="⏸ Pause"):(this.previewBtn.textContent="▶ Start",this.previewBtn.style.background="",this.previewStatus.textContent='Click "Start" then click on the main canvas',this.previewStatus.style.color="#666",this.isPlaying=!1,this.playPauseBtn.textContent="▶ Play",this.onLeave())}makeTex(){const t=this.gl,e=t.createTexture();return t.bindTexture(t.TEXTURE_2D,e),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,1,1,0,t.RGBA,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),e}makePair(){return[this.makeTex(),this.makeTex()]}buildProg(t){const i=new X(this.gl).linkProgram(K,t,"p"),s=this.gl.createVertexArray();this.gl.bindVertexArray(s),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.quadBuf);const a=this.gl.getAttribLocation(i.program,"a_position");return a>=0&&(this.gl.enableVertexAttribArray(a),this.gl.vertexAttribPointer(a,2,this.gl.FLOAT,!1,0,0)),this.gl.bindVertexArray(null),{program:i.program,vao:s}}use(t){return this.gl.useProgram(t.program),this.gl.bindVertexArray(t.vao),t.program}u(t,e){const i=this.gl.getUniformLocation(t,e);if(!i)throw new Error(`uniform not found: ${e}`);return i}bind(t,e){this.gl.activeTexture(this.gl.TEXTURE0+t),this.gl.bindTexture(this.gl.TEXTURE_2D,e)}readTex(t,e){const i=this.gl;i.bindFramebuffer(i.FRAMEBUFFER,this.fb),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,t,0);for(let s=1;s<5;s++)i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+s,i.TEXTURE_2D,null,0);i.drawBuffers([i.COLOR_ATTACHMENT0]),i.readBuffer(i.COLOR_ATTACHMENT0),i.readPixels(0,0,1,1,i.RGBA,i.FLOAT,e),i.bindFramebuffer(i.FRAMEBUFFER,null)}setDragging(t){t&&this.onLeave()}onClick(t,e){const i=t/this.mainCanvas.width,s=1-e/this.mainCanvas.height,a=this.config.phaseSpace.x.min+i*(this.config.phaseSpace.x.max-this.config.phaseSpace.x.min),r=this.config.phaseSpace.y.min+s*(this.config.phaseSpace.y.max-this.config.phaseSpace.y.min);this.active=!0,this.simulating=!1,this.stopAnim(),this.trail=[],this.diverged=!1,this.readIdx=0,this.freqAnalyzer.reset(),this.lastAnalysis=null,this.analysisFrameSkip=0,this.phaseSpaceGraph.reset(),this.trajectoryHistory=[],this.currentFrame=0,this.startFrame=null,this.endFrame=null,this.divergenceFrame=null,this.isPlaying=!0,this.playPauseBtn.textContent="⏸ Pause",this.playbackControls.style.display="none",this.gpuInit(a,r),this.readStates(),this.trail.push(this.bob2(this.baseSA,this.baseSB)),this.drawFrame(),this.previewStatus.textContent="Simulating...",this.previewStatus.style.color="#0d4",this.optimizeBtn.disabled=!0,this.optimizeBtn.textContent="Optimize (collecting data...)",clearTimeout(this.debounceTimer??void 0),this.debounceTimer=window.setTimeout(()=>{this.simulating=!0,this.loop()},100)}onLeave(){this.active=!1,this.simulating=!1,this.stopAnim(),clearTimeout(this.debounceTimer??void 0),this.ctx.clearRect(0,0,this.drawCanvas.width,this.drawCanvas.height),this.graphCtx.clearRect(0,0,this.graphCanvas.width,this.graphCanvas.height),this.previewEnabled&&(this.previewStatus.textContent="Click on the main canvas to start simulation",this.previewStatus.style.color="#888")}stopAnim(){this.animId!==null&&(cancelAnimationFrame(this.animId),this.animId=null)}gpuInit(t,e){const i=this.gl,s=this.use(this.initProg),a=this.config.phaseSpace.initialValues;if(this.systemKey==="rigid"){const r=[a.angle1,a.velocity1,a.angle2,a.velocity2],n=$[this.config.phaseSpace.x.dimension],l=$[this.config.phaseSpace.y.dimension],u=d=>d===0?0:d===1?1:d===4?2:d===5?3:-1,c=u(n),p=u(l);c>=0&&(r[c]+=t),p>=0&&(r[p]+=e),i.uniform4f(this.u(s,"u_initialState"),r[0],r[1],r[2],r[3])}else{const r=[a.angle1,a.velocity1,a.stretch1,a.stretchRate1],n=[a.angle2,a.velocity2,a.stretch2,a.stretchRate2],l=$[this.config.phaseSpace.x.dimension],u=$[this.config.phaseSpace.y.dimension];l<4?r[l]+=t:n[l-4]+=t,u<4?r[u]+=e:n[u-4]+=e,i.uniform4f(this.u(s,"u_initialA"),r[0],r[1],r[2],r[3]),i.uniform4f(this.u(s,"u_initialB"),n[0],n[1],n[2],n[3])}i.uniform1f(this.u(s,"u_perturb"),this.config.perturb),i.bindFramebuffer(i.FRAMEBUFFER,this.fb);for(let r=0;r<5;r++)i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+r,i.TEXTURE_2D,null,0);this.systemKey==="elastic"||this.systemKey==="nonlinear"?(i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,this.baseAPair[0],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT1,i.TEXTURE_2D,this.baseBPair[0],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT2,i.TEXTURE_2D,this.pertAPair[0],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT3,i.TEXTURE_2D,this.pertBPair[0],0),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1,i.COLOR_ATTACHMENT2,i.COLOR_ATTACHMENT3])):(i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,this.baseAPair[0],0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT1,i.TEXTURE_2D,this.pertAPair[0],0),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1])),i.viewport(0,0,1,1),i.drawArrays(i.TRIANGLE_STRIP,0,4),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindVertexArray(null)}gpuStep(t,e,i){const s=this.gl,a=i,r=1-a,n=this.use(this.physicsProg);s.uniform1f(this.u(n,"u_dt"),this.config.dt),s.uniform1i(this.u(n,"u_steps"),15),s.bindFramebuffer(s.FRAMEBUFFER,this.fb);for(let l=0;l<5;l++)s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+l,s.TEXTURE_2D,null,0);this.systemKey==="elastic"||this.systemKey==="nonlinear"?(this.bind(0,t[a]),this.bind(1,e[a]),s.uniform1i(this.u(n,"u_stateTextureA"),0),s.uniform1i(this.u(n,"u_stateTextureB"),1),s.uniform1f(this.u(n,"u_k1"),this.config.k1),s.uniform1f(this.u(n,"u_k2"),this.config.k2),s.uniform1f(this.u(n,"u_m1"),this.config.m1),s.uniform1f(this.u(n,"u_m2"),this.config.m2),s.uniform1f(this.u(n,"u_L1"),this.config.L1),s.uniform1f(this.u(n,"u_L2"),this.config.L2),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,t[r],0),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT1,s.TEXTURE_2D,e[r],0),s.drawBuffers([s.COLOR_ATTACHMENT0,s.COLOR_ATTACHMENT1])):(this.bind(0,t[a]),s.uniform1i(this.u(n,"u_stateTexture"),0),s.uniform1f(this.u(n,"u_m1"),this.config.m1),s.uniform1f(this.u(n,"u_m2"),this.config.m2),s.uniform1f(this.u(n,"u_L1"),this.config.L1),s.uniform1f(this.u(n,"u_L2"),this.config.L2),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,t[r],0),s.drawBuffers([s.COLOR_ATTACHMENT0])),s.viewport(0,0,1,1),s.drawArrays(s.TRIANGLE_STRIP,0,4),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindVertexArray(null)}readStates(){const t=this.readIdx;this.readTex(this.baseAPair[t],this.baseSA),this.readTex(this.pertAPair[t],this.pertSA),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&(this.readTex(this.baseBPair[t],this.baseSB),this.readTex(this.pertBPair[t],this.pertSB))}decodeAngles(t,e){return this.systemKey==="rigid"?{t1:t[0],t2:t[2],l1:this.config.L1,l2:this.config.L2}:{t1:t[0],t2:e[0],l1:this.config.L1+t[2],l2:this.config.L2+e[2]}}bob2(t,e){const{t1:i,t2:s,l1:a,l2:r}=this.decodeAngles(t,e),n=a*Math.sin(i),l=-a*Math.cos(i);return{x:n+r*Math.sin(s),y:l-r*Math.cos(s)}}calculateEnergies(t,e){const{t1:i,t2:s,l1:a,l2:r}=this.decodeAngles(t,e),n=t[1],l=this.systemKey==="rigid"?t[3]:e[1],u=-a*Math.cos(i),c=u-r*Math.cos(s),p=this.systemKey==="elastic"||this.systemKey==="nonlinear"?t[3]:0,d=this.systemKey==="elastic"||this.systemKey==="nonlinear"?e[3]:0,f=p*Math.sin(i)+a*n*Math.cos(i),m=-p*Math.cos(i)+a*n*Math.sin(i),v=f+d*Math.sin(s)+r*l*Math.cos(s),g=m-d*Math.cos(s)+r*l*Math.sin(s),_=.5*this.config.m1*(f*f+m*m)+.5*this.config.m2*(v*v+g*g),A=9.81,x=this.config.m1*A*u+this.config.m2*A*c;let y=0;if(this.systemKey==="elastic"||this.systemKey==="nonlinear"){const T=t[2],F=e[2];if(this.systemKey==="nonlinear"){const w=this.config.L1,D=this.config.L2,C=Math.abs(T),E=Math.abs(F),z=this.config.k1*w*(Math.exp(C/w)-1-C/w),H=this.config.k2*D*(Math.exp(E/D)-1-E/D);y=z+H}else y=.5*this.config.k1*T*T+.5*this.config.k2*F*F}return{ke:_,pe:x,ee:y}}checkDivergence(){const t=Math.PI,e=(r,n)=>{const l=r-n;return l-2*t*Math.floor(l/(2*t)+.5)},i=this.baseSA,s=this.pertSA;let a=e(i[0],s[0])**2+(i[1]-s[1])**2;if(this.systemKey==="rigid")a+=e(i[2],s[2])**2+(i[3]-s[3])**2;else{const r=this.baseSB,n=this.pertSB;a+=e(r[0],n[0])**2+(r[1]-n[1])**2+(i[2]-s[2])**2+(i[3]-s[3])**2+(r[2]-n[2])**2+(r[3]-n[3])**2}return Math.sqrt(a)>.05}loop(){if(!this.active||!this.simulating)return;if(!this.isPlaying){this.drawFrame(),this.animId=requestAnimationFrame(()=>this.loop());return}const t=1-this.readIdx;this.gpuStep(this.baseAPair,this.baseBPair,this.readIdx),this.gpuStep(this.pertAPair,this.pertBPair,this.readIdx),this.readIdx=t,this.readStates(),!this.diverged&&this.checkDivergence()&&(this.diverged=!0,this.divergenceFrame=this.trajectoryHistory.length);const e=l=>{const u=Math.PI;return l-2*u*Math.floor((l+u)/(2*u))},i=e(this.baseSA[0]),s=this.baseSA[1],a=e(this.systemKey==="rigid"?this.baseSA[2]:this.baseSB[0]),r=this.systemKey==="rigid"?this.baseSA[3]:this.baseSB[1],n=this.calculateEnergies(this.baseSA,this.baseSB);if(this.phaseSpaceGraph.addPoint(i,s,a,r,n.ke,n.pe,n.ee),this.systemKey==="rigid"?this.trajectoryHistory.push({angle1:this.baseSA[0],velocity1:this.baseSA[1],angle2:this.baseSA[2],velocity2:this.baseSA[3],stretch1:0,stretchRate1:0,stretch2:0,stretchRate2:0}):this.trajectoryHistory.push({angle1:this.baseSA[0],velocity1:this.baseSA[1],stretch1:this.baseSA[2],stretchRate1:this.baseSA[3],angle2:this.baseSB[0],velocity2:this.baseSB[1],stretch2:this.baseSB[2],stretchRate2:this.baseSB[3]}),this.trajectoryHistory.length>=500&&!this.isOptimizing&&(this.optimizeBtn.disabled=!1,this.optimizeBtn.textContent="Find Periodic Orbit"),!this.diverged){const l=this.bob2(this.baseSA,this.baseSB);this.trail.push(l)}this.trajectoryHistory.length>=100&&(this.playbackControls.style.display="block",this.scrubber.max=String(this.trajectoryHistory.length-1),this.currentFrame=this.trajectoryHistory.length-1,this.updateTimeDisplay()),this.drawFrame(),this.animId=requestAnimationFrame(()=>this.loop())}drawFrame(){const t=this.ctx,e=this.drawCanvas.width,i=this.drawCanvas.height;if(t.clearRect(0,0,e,i),!this.active)return;const s=!this.isPlaying&&this.trajectoryHistory.length>0,a=s?this.currentFrame:this.trajectoryHistory.length-1,r=s&&a>=0&&a<this.trajectoryHistory.length?this.trajectoryHistory[a]:null,n=this.boxSize,l=(this.trail.length>0?Math.max(...this.trail.map(S=>Math.max(Math.abs(S.x),Math.abs(S.y)))):2)*1.15,u=Math.min(this.armScale,(n/2-20)/l),c=n/2,p=i/2,d=(S,B)=>({px:c+S*u,py:p-B*u});t.save(),t.fillStyle=this.diverged?"rgba(40, 20, 8, 0.88)":"rgba(8, 10, 16, 0.88)",t.fillRect(0,0,e,i);const f=s?Math.min(a+1,this.trail.length):this.trail.length;if(f>1){t.beginPath();for(let S=0;S<f;S++){const B=d(this.trail[S].x,this.trail[S].y);S===0?t.moveTo(B.px,B.py):t.lineTo(B.px,B.py)}t.strokeStyle=this.diverged?"rgba(0, 212, 170, 0.5)":"rgba(0, 212, 170, 0.7)",t.lineWidth=1.5,t.stroke(),this.diverged||(t.shadowColor="rgba(0, 212, 170, 0.4)",t.shadowBlur=6,t.strokeStyle="rgba(0, 212, 170, 0.3)",t.lineWidth=1,t.stroke(),t.shadowBlur=0)}let m,v;if(r){const S=this.systemKey==="rigid"?new Float32Array([r.angle1,r.velocity1,r.angle2,r.velocity2]):new Float32Array([r.angle1,r.velocity1,r.stretch1,r.stretchRate1]),B=this.systemKey==="rigid"?null:new Float32Array([r.angle2,r.velocity2,r.stretch2,r.stretchRate2]);m=this.decodeAngles(S,B),v=m}else m=this.decodeAngles(this.baseSA,this.baseSB),v=this.decodeAngles(this.pertSA,this.pertSB);const g=m.l1*Math.sin(m.t1),_=-m.l1*Math.cos(m.t1),A=g+m.l2*Math.sin(m.t2),x=_-m.l2*Math.cos(m.t2),y=v.l1*Math.sin(v.t1),T=-v.l1*Math.cos(v.t1),F=y+v.l2*Math.sin(v.t2),w=T-v.l2*Math.cos(v.t2),D=d(0,0),C=d(y,T),E=d(F,w);t.beginPath(),t.moveTo(D.px,D.py),t.lineTo(C.px,C.py),t.lineTo(E.px,E.py),t.strokeStyle="rgba(232, 160, 48, 0.35)",t.lineWidth=1.5,t.stroke();const z=2+this.config.m1*2,H=2.5+this.config.m2*2.5;t.beginPath(),t.arc(C.px,C.py,z*.7,0,Math.PI*2),t.fillStyle="rgba(232, 160, 48, 0.3)",t.fill(),t.beginPath(),t.arc(E.px,E.py,H*.7,0,Math.PI*2),t.fillStyle="rgba(232, 160, 48, 0.4)",t.fill();const U=d(0,0),R=d(g,_),N=d(A,x);if(t.beginPath(),t.moveTo(U.px,U.py),t.lineTo(R.px,R.py),t.strokeStyle="rgba(200, 202, 212, 0.6)",t.lineWidth=2,t.stroke(),t.beginPath(),t.moveTo(R.px,R.py),t.lineTo(N.px,N.py),t.strokeStyle="rgba(0, 212, 170, 0.7)",t.lineWidth=2,t.stroke(),t.beginPath(),t.arc(R.px,R.py,z,0,Math.PI*2),t.fillStyle="rgba(200, 202, 212, 0.5)",t.fill(),t.beginPath(),t.arc(N.px,N.py,H,0,Math.PI*2),t.fillStyle="#00d4aa",t.fill(),t.shadowColor="rgba(0, 212, 170, 0.5)",t.shadowBlur=8,t.fill(),t.shadowBlur=0,t.beginPath(),t.arc(U.px,U.py,2.5,0,Math.PI*2),t.fillStyle="rgba(200, 202, 212, 0.4)",t.fill(),t.font="500 10px monospace",t.fillStyle="rgba(200, 202, 212, 0.7)",t.textAlign="left",(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&t.fillText(`l₁ ${m.l1.toFixed(2)}  l₂ ${m.l2.toFixed(2)}`,8,i-32),t.fillText(`θ₁ ${m.t1.toFixed(2)}`,8,i-20),t.fillText(`θ₂ ${m.t2.toFixed(2)}`,8,i-8),this.diverged&&(t.font="600 9px monospace",t.fillStyle="rgba(232, 160, 48, 0.9)",t.textAlign="right",t.fillText("DIVERGED",e-6,i-8)),this.lastAnalysis)if(t.font="500 10px monospace",t.textAlign="right",this.lastAnalysis.isPeriodic){t.fillStyle="rgba(100, 220, 120, 0.9)";const S=this.lastAnalysis.period!==null?this.lastAnalysis.period.toFixed(2):"?";t.fillText(`PERIODIC  T=${S}s`,e-6,18),t.fillStyle="rgba(100, 220, 120, 0.5)",t.fillText(`conf ${(this.lastAnalysis.confidence*100).toFixed(0)}%`,e-6,30)}else t.fillStyle="rgba(220, 100, 100, 0.9)",t.fillText("CHAOTIC",e-6,18),this.lastAnalysis.confidence>0&&(t.fillStyle="rgba(220, 100, 100, 0.5)",t.fillText(`conf ${(this.lastAnalysis.confidence*100).toFixed(0)}%`,e-6,30));t.restore();const J=this.systemKey==="elastic"||this.systemKey==="nonlinear";this.phaseSpaceGraph.draw(J,this.currentFrame,this.startFrame,this.endFrame,this.divergenceFrame),this.phaseSpaceGraph.drawPoincare()}togglePlayPause(){this.isPlaying=!this.isPlaying,this.playPauseBtn.textContent=this.isPlaying?"⏸ Pause":"▶ Play"}onScrub(){this.currentFrame=parseInt(this.scrubber.value),this.isPlaying=!1,this.playPauseBtn.textContent="▶ Play",this.updateTimeDisplay(),this.drawFrame()}updateTimeDisplay(){const t=this.currentFrame*this.config.dt*15;this.timeDisplay.textContent=`${t.toFixed(2)}s`,this.scrubber.value=String(this.currentFrame)}setStartPoint(){this.startFrame=this.snapToKEMinima(this.currentFrame),this.currentFrame=this.startFrame,this.updateTimeDisplay(),this.updatePeriodSelection(),this.drawFrame()}setEndPoint(){this.endFrame=this.snapToKEMinima(this.currentFrame),this.currentFrame=this.endFrame,this.updateTimeDisplay(),this.updatePeriodSelection(),this.drawFrame()}snapToKEMinima(t,e=15){const i=Math.max(0,t-e),s=Math.min(this.trajectoryHistory.length-1,t+e);let a=t,r=1/0;for(let n=i;n<=s;n++){const l=this.trajectoryHistory[n],{t1:u,t2:c,l1:p,l2:d}=this.decodeAngles(this.systemKey==="rigid"?new Float32Array([l.angle1,l.velocity1,l.angle2,l.velocity2]):new Float32Array([l.angle1,l.velocity1,l.stretch1,l.stretchRate1]),this.systemKey==="rigid"?null:new Float32Array([l.angle2,l.velocity2,l.stretch2,l.stretchRate2])),f=l.velocity1,m=l.velocity2,v=this.systemKey==="elastic"||this.systemKey==="nonlinear"?l.stretchRate1:0,g=this.systemKey==="elastic"||this.systemKey==="nonlinear"?l.stretchRate2:0,_=v*Math.sin(u)+p*f*Math.cos(u),A=-v*Math.cos(u)+p*f*Math.sin(u),x=_+g*Math.sin(c)+d*m*Math.cos(c),y=A-g*Math.cos(c)+d*m*Math.sin(c),T=.5*this.config.m1*(_*_+A*A)+.5*this.config.m2*(x*x+y*y);T<r&&(r=T,a=n)}return a}updatePeriodSelection(){if(this.startFrame!==null&&this.endFrame!==null){const t=Math.abs(this.endFrame-this.startFrame)*this.config.dt*15;this.periodSelection.textContent=`Period: ${t.toFixed(3)}s (${this.startFrame} → ${this.endFrame})`,this.periodSelection.style.color="#0d4"}else this.startFrame!==null?(this.periodSelection.textContent=`Start: frame ${this.startFrame} (set end point)`,this.periodSelection.style.color="#888"):this.endFrame!==null?(this.periodSelection.textContent=`End: frame ${this.endFrame} (set start point)`,this.periodSelection.style.color="#888"):(this.periodSelection.textContent="No period selected",this.periodSelection.style.color="#888")}async startOptimization(){if(this.trajectoryHistory.length<500||this.isOptimizing)return;if(this.startFrame===null||this.endFrame===null){this.previewStatus.textContent="Please set start and end points first",this.previewStatus.style.color="#e8a030";return}this.isOptimizing=!0,this.optimizeBtn.disabled=!0,this.optimizeBtn.textContent="Optimizing...",this.previewStatus.textContent="Running GPU optimization...",this.previewStatus.style.color="#0d4",this.pauseResumeBtn.textContent="⏸ Pause",this.pauseResumeBtn.disabled=!1;const t=Math.abs(this.endFrame-this.startFrame),e=this.trajectoryHistory[this.startFrame],i={angle1:e.angle1,velocity1:e.velocity1,angle2:e.angle2,velocity2:e.velocity2,stretch1:e.stretch1,stretchRate1:e.stretchRate1,stretch2:e.stretch2,stretchRate2:e.stretchRate2};this.optimizer||(this.optimizer=new Tt(this.gl,this.config));const s=parseInt(this.cloudSizeSelect.value);this.optimizer.setCloudSize(s),this.optimizer.setOnLog(a=>{this.appendLogEntry(a)}),this.optimizer.setOnProgress((a,r)=>{var n;this.previewStatus.textContent=`Cycle ${a}: best residual = ${r.toExponential(2)}`,(n=this.optimizer)!=null&&n.getBestState()&&(this.seedState=this.optimizer.getBestState(),this.initSeedSimulation())});try{await this.optimizer.startOptimization(i,t);const a=this.optimizer.getBestState();a&&(this.seedState=a,this.initSeedSimulation(),this.saveOptimizedPendulum(a,t*this.config.dt*15)),this.previewStatus.textContent=`Optimization complete. Best residual = ${this.optimizer.getBestResidual().toExponential(2)}`,this.previewStatus.style.color="#0d4"}catch(a){console.error("Optimization failed:",a),this.previewStatus.textContent="Optimization failed",this.previewStatus.style.color="#e84"}finally{this.isOptimizing=!1,this.optimizeBtn.disabled=!1,this.optimizeBtn.textContent="Find Periodic Orbit",this.pauseResumeBtn.disabled=!0}}toggleOptimizerPause(){this.optimizer&&(this.optimizer.isActive()?(this.optimizer.pause(),this.pauseResumeBtn.textContent="▶ Resume",this.previewStatus.textContent="Optimization paused"):(this.optimizer.resume(),this.pauseResumeBtn.textContent="⏸ Pause",this.previewStatus.textContent="Optimization resumed"))}appendLogEntry(t){const e=document.createElement("div");e.style.cssText="font-size: 0.7rem; font-family: monospace; padding: 2px 0; border-bottom: 1px solid #222;";const i=t.residuals.map(a=>a.toExponential(1)).join(", "),s=t.newBest?" ★ NEW BEST":"";e.innerHTML=`
      <span style="color: #888;">[${t.cycle}]</span>
      <span style="color: ${t.newBest?"#0d4":"#ccc"};">res=${t.bestResidual.toExponential(2)}${s}</span>
      <span style="color: #666;"> | pert=${t.perturbScale.toExponential(1)} dt=${t.dt.toExponential(1)} periods=${t.numPeriods}</span>
      <div style="color: #444; margin-left: 12px;">[${i}]</div>
    `,this.optimizerConsole.appendChild(e),this.optimizerConsole.scrollTop=this.optimizerConsole.scrollHeight}initSeedSimulation(){if(!this.seedState)return;const t=this.gl,e=this.use(this.initProg);this.systemKey==="rigid"?t.uniform4f(this.u(e,"u_initialState"),this.seedState.angle1,this.seedState.velocity1,this.seedState.angle2,this.seedState.velocity2):(t.uniform4f(this.u(e,"u_initialA"),this.seedState.angle1,this.seedState.velocity1,this.seedState.stretch1,this.seedState.stretchRate1),t.uniform4f(this.u(e,"u_initialB"),this.seedState.angle2,this.seedState.velocity2,this.seedState.stretch2,this.seedState.stretchRate2)),t.uniform1f(this.u(e,"u_perturb"),0),t.bindFramebuffer(t.FRAMEBUFFER,this.fb);for(let s=0;s<5;s++)t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+s,t.TEXTURE_2D,null,0);this.systemKey==="elastic"||this.systemKey==="nonlinear"?(t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,this.seedAPair[0],0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,this.seedBPair[0],0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1])):(t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,this.seedAPair[0],0),t.drawBuffers([t.COLOR_ATTACHMENT0])),t.viewport(0,0,1,1),t.drawArrays(t.TRIANGLE_STRIP,0,4),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindVertexArray(null),this.seedReadIdx=0,this.seedTrail=[],this.seedFrame=0,this.seedIsPlaying=!0,this.seedPlayPauseBtn.textContent="⏸ Pause",this.readSeedStates();const i=this.bob2(this.seedSA,this.seedSB);this.seedTrail.push(i),this.seedAnimId!==null&&(cancelAnimationFrame(this.seedAnimId),this.seedAnimId=null),this.seedLoop()}seedLoop(){if(this.seedState){if(this.seedIsPlaying){const t=1-this.seedReadIdx;this.gpuStep(this.seedAPair,this.seedBPair,this.seedReadIdx),this.seedReadIdx=t,this.readSeedStates(),this.seedFrame++;const e=this.bob2(this.seedSA,this.seedSB);this.seedTrail.push(e),this.seedTrail.length>500&&this.seedTrail.shift()}this.drawSeedFrame(),this.seedAnimId=requestAnimationFrame(()=>this.seedLoop())}}readSeedStates(){const t=this.seedReadIdx;this.readTex(this.seedAPair[t],this.seedSA),(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&this.readTex(this.seedBPair[t],this.seedSB)}drawSeedFrame(){const t=this.seedPreviewCtx,e=this.seedPreviewCanvas.width,i=this.seedPreviewCanvas.height;if(t.clearRect(0,0,e,i),!this.seedState)return;const s=this.boxSize,a=(this.seedTrail.length>0?Math.max(...this.seedTrail.map(y=>Math.max(Math.abs(y.x),Math.abs(y.y)))):2)*1.15,r=Math.min(this.armScale,(s/2-20)/a),n=s/2,l=i/2,u=(y,T)=>({px:n+y*r,py:l-T*r});if(t.save(),t.fillStyle="rgba(8, 10, 16, 0.88)",t.fillRect(0,0,e,i),this.seedTrail.length>1){t.beginPath();for(let y=0;y<this.seedTrail.length;y++){const T=u(this.seedTrail[y].x,this.seedTrail[y].y);y===0?t.moveTo(T.px,T.py):t.lineTo(T.px,T.py)}t.strokeStyle="rgba(0, 212, 170, 0.7)",t.lineWidth=1.5,t.stroke(),t.shadowColor="rgba(0, 212, 170, 0.4)",t.shadowBlur=6,t.strokeStyle="rgba(0, 212, 170, 0.3)",t.lineWidth=1,t.stroke(),t.shadowBlur=0}const c=this.decodeAngles(this.seedSA,this.seedSB),p=c.l1*Math.sin(c.t1),d=-c.l1*Math.cos(c.t1),f=p+c.l2*Math.sin(c.t2),m=d-c.l2*Math.cos(c.t2),v=u(0,0),g=u(p,d),_=u(f,m);t.beginPath(),t.moveTo(v.px,v.py),t.lineTo(g.px,g.py),t.strokeStyle="rgba(200, 202, 212, 0.6)",t.lineWidth=2,t.stroke(),t.beginPath(),t.moveTo(g.px,g.py),t.lineTo(_.px,_.py),t.strokeStyle="rgba(0, 212, 170, 0.7)",t.lineWidth=2,t.stroke();const A=2+this.config.m1*2,x=2.5+this.config.m2*2.5;t.beginPath(),t.arc(g.px,g.py,A,0,Math.PI*2),t.fillStyle="rgba(200, 202, 212, 0.5)",t.fill(),t.beginPath(),t.arc(_.px,_.py,x,0,Math.PI*2),t.fillStyle="#00d4aa",t.fill(),t.shadowColor="rgba(0, 212, 170, 0.5)",t.shadowBlur=8,t.fill(),t.shadowBlur=0,t.beginPath(),t.arc(v.px,v.py,2.5,0,Math.PI*2),t.fillStyle="rgba(200, 202, 212, 0.4)",t.fill(),t.font="500 10px monospace",t.fillStyle="rgba(200, 202, 212, 0.7)",t.textAlign="left",(this.systemKey==="elastic"||this.systemKey==="nonlinear")&&t.fillText(`l₁ ${c.l1.toFixed(2)}  l₂ ${c.l2.toFixed(2)}`,8,i-32),t.fillText(`θ₁ ${c.t1.toFixed(2)}`,8,i-20),t.fillText(`θ₂ ${c.t2.toFixed(2)}`,8,i-8),t.font="500 10px monospace",t.fillStyle="rgba(0, 212, 170, 0.9)",t.textAlign="right",t.fillText("SEED (optimized)",e-6,18),t.restore()}toggleSeedPlayPause(){this.seedIsPlaying=!this.seedIsPlaying,this.seedPlayPauseBtn.textContent=this.seedIsPlaying?"⏸ Pause":"▶ Play"}saveOptimizedPendulum(t,e){var r,n;const i="chaoticPendulums_saved",s=JSON.parse(localStorage.getItem(i)||"[]"),a={timestamp:Date.now(),system:this.config.system,initialState:t,period:e,residual:((r=this.optimizer)==null?void 0:r.getBestResidual())??0,converged:(((n=this.optimizer)==null?void 0:n.getBestResidual())??1)<1e-6};s.push(a),s.length>20&&s.shift(),localStorage.setItem(i,JSON.stringify(s)),this.updateSavedPendulumsList()}updateSavedPendulumsList(){const t=document.getElementById("savedPendulumsList");if(!t)return;const i=JSON.parse(localStorage.getItem("chaoticPendulums_saved")||"[]");if(i.length===0){t.innerHTML='<div style="font-size: 0.75rem; color: #666;">No saved pendulums yet</div>';return}t.innerHTML=i.map((s,a)=>`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px; background: rgba(20,20,30,0.5); border-radius: 3px; margin-bottom: 4px;">
          <span style="font-size: 0.75rem; color: #aaa;">${s.converged?"✓":"⚠"} ${s.system} T=${s.period.toFixed(3)}s</span>
          <div style="display: flex; gap: 4px;">
            <button data-idx="${a}" class="load-pendulum-btn" style="padding: 1px 6px; font-size: 0.7rem;">Load</button>
            <button data-idx="${a}" class="delete-pendulum-btn" style="padding: 1px 6px; font-size: 0.7rem; background: #3a2020;">×</button>
          </div>
        </div>
      `).join(""),t.querySelectorAll(".load-pendulum-btn").forEach(s=>{s.addEventListener("click",a=>{const r=parseInt(a.target.dataset.idx);this.loadSavedPendulum(r)})}),t.querySelectorAll(".delete-pendulum-btn").forEach(s=>{s.addEventListener("click",a=>{const r=parseInt(a.target.dataset.idx);this.deleteSavedPendulum(r)})})}deleteSavedPendulum(t){const e="chaoticPendulums_saved",i=JSON.parse(localStorage.getItem(e)||"[]");i.splice(t,1),localStorage.setItem(e,JSON.stringify(i)),this.updateSavedPendulumsList()}loadSavedPendulum(t){const i=JSON.parse(localStorage.getItem("chaoticPendulums_saved")||"[]");if(t<0||t>=i.length)return;const s=i[t],a=s.system==="rigid"?"rigid":s.system==="nonlinear"?"nonlinear":"elastic";a!==this.systemKey&&this.switchSystemType(a,s.system),this.seedState=s.initialState,this.initSeedSimulation(),this.previewStatus.textContent=`Loaded saved pendulum: ${s.system} T=${s.period.toFixed(3)}s`,this.previewStatus.style.color="#0d4"}switchSystemType(t,e){var a;this.config.system=e,this.systemKey=t,(t==="elastic"||t==="nonlinear")&&(this.baseBPair||(this.baseBPair=this.makePair()),this.pertBPair||(this.pertBPair=this.makePair()),this.seedBPair||(this.seedBPair=this.makePair()),this.baseSB||(this.baseSB=new Float32Array(4)),this.pertSB||(this.pertSB=new Float32Array(4)),this.seedSB||(this.seedSB=new Float32Array(4)));const i=this.gl;i.deleteProgram(this.initProg.program),i.deleteVertexArray(this.initProg.vao),i.deleteProgram(this.physicsProg.program),i.deleteVertexArray(this.physicsProg.vao),this.initProg=this.buildProg(M.buildPreviewInit(this.systemKey)),this.physicsProg=this.buildProg(M.buildPreviewPhysicsLoop(this.systemKey)),this.optimizer&&(this.optimizer.dispose(),this.optimizer=null);const s=document.getElementById("systemType");s&&(s.value=e),(a=this.onConfigChange)==null||a.call(this)}rebuildForConfig(t){const e=t.system==="rigid"?"rigid":t.system==="nonlinear"?"nonlinear":"elastic";if(this.config=t,e!==this.systemKey){this.systemKey=e,(e==="elastic"||e==="nonlinear")&&(this.baseBPair||(this.baseBPair=this.makePair()),this.pertBPair||(this.pertBPair=this.makePair()),this.seedBPair||(this.seedBPair=this.makePair()),this.baseSB||(this.baseSB=new Float32Array(4)),this.pertSB||(this.pertSB=new Float32Array(4)),this.seedSB||(this.seedSB=new Float32Array(4)));const i=this.gl;i.deleteProgram(this.initProg.program),i.deleteVertexArray(this.initProg.vao),i.deleteProgram(this.physicsProg.program),i.deleteVertexArray(this.physicsProg.vao),this.initProg=this.buildProg(M.buildPreviewInit(this.systemKey)),this.physicsProg=this.buildProg(M.buildPreviewPhysicsLoop(this.systemKey))}this.optimizer&&(this.optimizer.dispose(),this.optimizer=null),this.onLeave()}dispose(){this.stopAnim(),this.seedAnimId!==null&&cancelAnimationFrame(this.seedAnimId),clearTimeout(this.debounceTimer??void 0);const t=this.gl;t.deleteProgram(this.initProg.program),t.deleteVertexArray(this.initProg.vao),t.deleteProgram(this.physicsProg.program),t.deleteVertexArray(this.physicsProg.vao),t.deleteFramebuffer(this.fb),t.deleteBuffer(this.quadBuf);const e=[this.baseAPair,this.pertAPair,this.seedAPair];this.baseBPair&&e.push(this.baseBPair),this.pertBPair&&e.push(this.pertBPair),this.seedBPair&&e.push(this.seedBPair);for(const i of e)t.deleteTexture(i[0]),t.deleteTexture(i[1]);this.optimizer&&this.optimizer.dispose()}}class Mt{constructor(t,e){o(this,"gl");o(this,"config");o(this,"quadBuffer");o(this,"sharedTextures");o(this,"sharedUniforms");o(this,"simulator",null);o(this,"renderer");o(this,"zoomController");o(this,"ui");o(this,"stats");o(this,"preview");o(this,"canvas");o(this,"isDragging",!1);o(this,"dragStart",null);o(this,"dragCurrent",null);o(this,"playState","idle");this.canvas=t,this.config={...e};const i=t.getContext("webgl2",{antialias:!1,preserveDrawingBuffer:!0});if(!i)throw new Error("WebGL 2.0 not supported");this.gl=i,i.getExtension("EXT_color_buffer_float"),this.quadBuffer=new nt(i),this.sharedTextures=new Y(i),this.sharedUniforms=new j(i),this.renderer=new ht(i,this.config,this.sharedTextures,this.sharedUniforms,this.quadBuffer.buffer),this.zoomController=new V(this.config,()=>this.onZoomChange()),this.ui=new ct,this.stats=new dt,this.preview=new St(document.getElementById("canvasWrapper"),t,this.gl,this.config),this.preview.onConfigChange=()=>{this.handleSystemChange(),this.ui.updateModeUI(this.config),this.ui.updatePendulumParams(this.config),this.ui.updatePhaseSpaceInputs(this.config),this.markStale()},this.setupControls(),this.setupZoomControls(),this.updatePlayButton(),this.animate()}rebuildSimulator(){this.simulator&&this.simulator.dispose(),this.simulator=new lt(this.gl,this.config,this.quadBuffer.buffer),this.preview.rebuildForConfig(this.config),this.config.vizMode==="divergence"||this.config.vizMode==="divergenceDistance"?this.simulator.startDivergence(()=>this.onDivergenceRender()):this.simulator.reset()}markStale(){this.playState==="playing"?this.playState="paused":this.playState==="paused"&&(this.playState="stale"),this.updatePlayButton()}togglePlay(){this.playState==="idle"||this.playState==="stale"?(this.rebuildSimulator(),this.playState="playing"):this.playState==="playing"?this.playState="paused":this.playState==="paused"&&(this.playState="playing"),this.updatePlayButton()}updatePlayButton(){const t=this.ui.getElement("playBtn");t&&(this.playState==="idle"?t.textContent="▶ Render":this.playState==="playing"?t.textContent="⏸ Pause":this.playState==="paused"?t.textContent="▶ Resume":this.playState==="stale"&&(t.textContent="⟳ Rerender"))}onDivergenceRender(){if(this.simulator)if(this.simulator.isChunkedMode()){const t=[],e=this.simulator.getChunksPerSide();for(let s=0;s<e;s++)for(let a=0;a<e;a++){const r=this.simulator.getChunkResultTexture(a,s);r&&t.push(r)}const i=this.simulator.getCurrentChunkInfo();i&&t.push(i.texture),t.length>0&&this.renderer.computeMaxValueFromChunks(t)}else this.renderer.computeMaxValue(this.simulator.getDataTexture())}onZoomChange(){this.ui.updatePhaseSpaceInputs(this.config),this.markStale()}setupControls(){this.ui.bindButton("playBtn",()=>this.togglePlay()),this.ui.bindControl("systemType",e=>{this.config.system=e,this.handleSystemChange(),this.ui.updateModeUI(this.config),this.ui.updatePendulumParams(this.config),this.ui.updatePhaseSpaceInputs(this.config),this.markStale()}),this.ui.bindControl("vizMode",e=>{this.config.vizMode=e,this.ui.updateModeUI(this.config),this.markStale()}),this.ui.bindControl("resolution",e=>{this.config.resolution=parseInt(e),this.canvas.width=this.config.resolution,this.canvas.height=this.config.resolution,this.ui.updateChunkSizeOptions(this.config.resolution),this.markStale()},"change"),this.ui.bindControl("chunkSize",e=>{this.config.chunkSize=parseInt(e),this.markStale()},"change"),this.ui.bindControl("xDimension",e=>{this.config.phaseSpace.x.dimension=e,this.applyAxisDefaults("x"),this.ui.updatePhaseSpaceInputs(this.config),this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension,this.config.phaseSpace.y.dimension),this.zoomController=new V(this.config,()=>this.onZoomChange()),this.markStale()},"change"),this.ui.bindControl("yDimension",e=>{this.config.phaseSpace.y.dimension=e,this.applyAxisDefaults("y"),this.ui.updatePhaseSpaceInputs(this.config),this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension,this.config.phaseSpace.y.dimension),this.zoomController=new V(this.config,()=>this.onZoomChange()),this.markStale()},"change"),["xMin","xMax","yMin","yMax"].forEach(e=>{this.ui.bindControl(e,i=>{const s=parseFloat(i);e==="xMin"?this.config.phaseSpace.x.min=s:e==="xMax"?this.config.phaseSpace.x.max=s:e==="yMin"?this.config.phaseSpace.y.min=s:e==="yMax"&&(this.config.phaseSpace.y.max=s),this.zoomController=new V(this.config,()=>this.onZoomChange()),this.markStale()},"change")}),Object.entries({initAngle1:"angle1",initVelocity1:"velocity1",initAngle2:"angle2",initVelocity2:"velocity2",initStretch1:"stretch1",initStretchRate1:"stretchRate1",initStretch2:"stretch2",initStretchRate2:"stretchRate2"}).forEach(([e,i])=>{this.ui.bindControl(e,s=>{this.config.phaseSpace.initialValues[i]=parseFloat(s),this.markStale()},"change")}),this.ui.bindControl("dt",e=>{this.config.dt=parseFloat(e),this.ui.updateIntegrationInputs(this.config),this.markStale()},"change"),this.ui.bindControl("iterations",e=>{this.config.iterationsPerFrame=parseInt(e),this.ui.setTextContent("iterValue",String(this.config.iterationsPerFrame))}),this.ui.bindControl("maxIter",e=>{this.config.maxIter=parseInt(e),this.markStale()},"change"),this.ui.bindControl("perturb",e=>{this.config.perturb=parseFloat(e),this.ui.setTextContent("perturbValue",this.config.perturb.toFixed(6)),this.markStale()}),this.ui.bindControl("perturbDistribution",e=>{this.config.perturbDistribution=e,this.markStale()},"change"),this.ui.bindControl("trials",e=>{this.config.trials=Math.max(1,parseInt(e)||1),this.ui.setTextContent("trialsValue",String(this.config.trials)),this.markStale()}),this.ui.bindControl("colormap",e=>{this.config.colormap=parseInt(e),this.ui.updateLegend(this.config.colormap)},"change"),this.ui.bindControl("toneMapping",e=>{this.config.toneMapping=parseInt(e)},"change"),this.ui.bindButton("resetBtn",()=>{this.zoomController.reset(),this.ui.updatePhaseSpaceInputs(this.config),this.markStale()}),this.ui.bindButton("downloadBtn",()=>this.download()),this.ui.bindControl("m1",e=>{this.config.m1=parseFloat(e),this.ui.setTextContent("m1Value",this.config.m1.toFixed(1)),this.markStale()}),this.ui.bindControl("m2",e=>{this.config.m2=parseFloat(e),this.ui.setTextContent("m2Value",this.config.m2.toFixed(1)),this.markStale()}),this.ui.bindControl("L1",e=>{this.config.L1=parseFloat(e),this.ui.setTextContent("L1Value",this.config.L1.toFixed(1)),this.markStale()}),this.ui.bindControl("L2",e=>{this.config.L2=parseFloat(e),this.ui.setTextContent("L2Value",this.config.L2.toFixed(1)),this.markStale()}),this.ui.bindControl("k1",e=>{this.config.k1=parseFloat(e),this.ui.setTextContent("k1Value",String(this.config.k1)),this.markStale()}),this.ui.bindControl("k2",e=>{this.config.k2=parseFloat(e),this.ui.setTextContent("k2Value",String(this.config.k2)),this.markStale()}),this.ui.updateModeUI(this.config),this.ui.updateLegend(this.config.colormap),this.ui.updatePendulumParams(this.config),this.ui.updatePhaseSpaceInputs(this.config),this.ui.updateIntegrationInputs(this.config),this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension,this.config.phaseSpace.y.dimension)}handleSystemChange(){const e=this.config.system!=="rigid"?it:et;e.includes(this.config.phaseSpace.x.dimension)||(this.config.phaseSpace.x.dimension="angle1",this.applyAxisDefaults("x")),(!e.includes(this.config.phaseSpace.y.dimension)||this.config.phaseSpace.y.dimension===this.config.phaseSpace.x.dimension)&&(this.config.phaseSpace.y.dimension="angle2",this.applyAxisDefaults("y"))}applyAxisDefaults(t){const e=this.config.phaseSpace[t].dimension;e.startsWith("angle")?(this.config.phaseSpace[t].min=-Math.PI,this.config.phaseSpace[t].max=Math.PI):e.startsWith("stretch")&&!e.includes("Rate")?(this.config.phaseSpace[t].min=-.5,this.config.phaseSpace[t].max=.5):(this.config.phaseSpace[t].min=-5,this.config.phaseSpace[t].max=5)}setupZoomControls(){const t=document.getElementById("zoomOverlay");this.canvas.addEventListener("mousedown",e=>{if(e.button!==0)return;const i=this.canvas.getBoundingClientRect(),s=(e.clientX-i.left)*(this.canvas.width/i.width),a=(e.clientY-i.top)*(this.canvas.height/i.height);this.isDragging=!0,this.preview.setDragging(!0),this.dragStart={x:s,y:a},this.dragCurrent={x:s,y:a}}),this.canvas.addEventListener("mousemove",e=>{if(!this.isDragging)return;const i=this.canvas.getBoundingClientRect();this.dragCurrent={x:(e.clientX-i.left)*(this.canvas.width/i.width),y:(e.clientY-i.top)*(this.canvas.height/i.height)},this.updateZoomOverlay()}),this.canvas.addEventListener("mouseup",()=>{if(!this.isDragging)return;Math.sqrt((this.dragCurrent.x-this.dragStart.x)**2+(this.dragCurrent.y-this.dragStart.y)**2)>5&&this.zoomController.applyRectangle(this.dragStart.x,this.dragStart.y,this.dragCurrent.x,this.dragCurrent.y,this.canvas.width,this.canvas.height),this.isDragging=!1,this.preview.setDragging(!1),this.dragStart=null,this.dragCurrent=null,t.style.display="none"}),this.canvas.addEventListener("mouseleave",()=>{this.isDragging=!1,this.preview.setDragging(!1),this.dragStart=null,this.dragCurrent=null,t.style.display="none"}),this.canvas.addEventListener("contextmenu",e=>{e.preventDefault(),this.zoomController.zoomOut()}),this.ui.bindButton("zoomOutBtn",()=>this.zoomController.zoomOut())}updateZoomOverlay(){const t=document.getElementById("zoomOverlay"),e=document.getElementById("canvasWrapper");this.canvas.getBoundingClientRect();const i=e.getBoundingClientRect(),s=i.width/this.canvas.width,a=i.height/this.canvas.height,r=Math.min(this.dragStart.x,this.dragCurrent.x)*s,n=Math.min(this.dragStart.y,this.dragCurrent.y)*a,l=Math.max(this.dragStart.x,this.dragCurrent.x)*s,u=Math.max(this.dragStart.y,this.dragCurrent.y)*a;t.style.display="block",t.style.left=r+"px",t.style.top=n+"px",t.style.width=l-r+"px",t.style.height=u-n+"px"}renderCurrentState(){if(!this.simulator)return;if(this.simulator.isChunkedMode()){const e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.config.resolution,this.config.resolution),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);const i=this.simulator.getChunksPerSide(),s=this.config.chunkSize;for(let r=0;r<i;r++)for(let n=0;n<i;n++){const l=this.simulator.getChunkResultTexture(n,r);l&&this.renderer.renderAt(l,n*s,r*s,s,s)}const a=this.simulator.getCurrentChunkInfo();a&&this.renderer.renderAt(a.texture,a.cx*s,a.cy*s,s,s)}else this.renderer.render(this.simulator.getDataTexture())}animate(){if(this.simulator){const t=this.config.vizMode==="divergence"||this.config.vizMode==="divergenceDistance",e=this.simulator.isChunkedMode();this.playState==="playing"&&!this.simulator.isComplete()&&(t?this.simulator.stepDivergence():this.simulator.stepDistance(),!e&&!t&&this.renderer.computeMaxValue(this.simulator.getDataTexture()),this.simulator.getFrameCount()%60<2&&this.onDivergenceRender()),this.renderCurrentState();const i=this.simulator.getFrameCount(),s=this.simulator.isComplete();if(this.stats.update(this.config,i,this.renderer.getMaxValue(),s),this.ui.updateStats(i,this.renderer.getMaxValue(),this.stats.getFps(),this.zoomController.level),this.config.vizMode==="divergence"||this.config.vizMode==="divergenceDistance"){const r=this.simulator.getTrialProgress();this.ui.updateTrialStats(r.total>1,r.current,r.total)}else this.ui.updateTrialStats(!1,1,1);this.playState==="playing"&&s&&(this.playState="paused",this.updatePlayButton())}requestAnimationFrame(()=>this.animate())}download(){var e;const t=document.createElement("a");t.download=`chaos-${this.config.system}-${this.config.vizMode}-frame${((e=this.simulator)==null?void 0:e.getFrameCount())??0}.png`,t.href=this.canvas.toDataURL("image/png"),t.click()}}const Z=document.getElementById("canvas");if(!Z)throw new Error("Canvas not found");new Mt(Z,st);
