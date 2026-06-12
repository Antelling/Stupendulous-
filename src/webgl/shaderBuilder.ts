import rigidFrag from '../shaders/fragments/rigid.glsl?raw';
import elasticFrag from '../shaders/fragments/elastic.glsl?raw';
import nonlinearFrag from '../shaders/fragments/nonlinear.glsl?raw';
import bob2Frag from '../shaders/fragments/bob2.glsl?raw';
import hashFrag from '../shaders/fragments/hash.glsl?raw';

import type { PhaseSpaceDimension } from '../types/config.ts';

type System = 'rigid' | 'elastic' | 'nonlinear';
type Mode = 'distance' | 'divergence';

const HEADER = `#version 300 es
precision highp float;
`;

const DIM_INDEX: Record<PhaseSpaceDimension, number> = {
  angle1: 0,
  velocity1: 1,
  stretch1: 2,
  stretchRate1: 3,
  angle2: 4,
  velocity2: 5,
  stretch2: 6,
  stretchRate2: 7,
};

export class ShaderBuilder {
  static buildInit(system: System, mode: Mode): string {
    if (system === 'rigid') return mode === 'distance' ? this.rigidDistanceInit() : this.rigidDivergenceInit();
    if (system === 'nonlinear') return mode === 'distance' ? this.nonlinearDistanceInit() : this.nonlinearDivergenceInit();
    return mode === 'distance' ? this.elasticDistanceInit() : this.elasticDivergenceInit();
  }

  static buildPhysics(system: System): string {
    if (system === 'rigid') return this.rigidPhysics();
    if (system === 'nonlinear') return this.nonlinearPhysics();
    return this.elasticPhysics();
  }

  static buildAccumulate(system: System): string {
    if (system === 'rigid') return this.rigidAccumulate();
    if (system === 'nonlinear') return this.nonlinearAccumulate();
    return this.elasticAccumulate();
  }

  static buildBlit(): string {
    return `${HEADER}
uniform sampler2D u_src;
in vec2 v_uv;
out vec4 fragColor;

void main() {
    fragColor = texture(u_src, v_uv);
}`;
  }

  static buildDivergenceStep(system: System): string {
    if (system === 'rigid') return this.rigidDivergenceStep();
    if (system === 'nonlinear') return this.nonlinearDivergenceStep();
    return this.elasticDivergenceStep();
  }

  private static chunkCoordHelpers(): string {
    return `
vec2 getChunkedUV(vec2 v_uv, vec2 chunkOffset, float chunkScale) {
    return chunkOffset + v_uv * chunkScale;
}
`;
  }

  private static mappingHelpers(): string {
    return `
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
`;
  }

  private static rigidDistanceInit(): string {
    return `${HEADER}
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
}`;
  }

  private static rigidDivergenceInit(): string {
    return `${HEADER}
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

${hashFrag}
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

    float r = hash(uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;

    baseState = state;
    perturbedState = state + vec4(perturb_theta1, 0.0, perturb_theta2, 0.0);
    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`;
  }

  private static elasticDistanceInit(): string {
    return `${HEADER}
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
}`;
  }

  private static nonlinearDistanceInit(): string {
    return this.elasticDistanceInit();
  }

  private static nonlinearDivergenceInit(): string {
    return `${HEADER}
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

${hashFrag}
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

    float r = hash(uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;

    baseA = a;
    baseB = b;
    pertA = a + vec4(perturb_theta1, 0.0, 0.0, 0.0);
    pertB = b + vec4(perturb_theta2, 0.0, 0.0, 0.0);

    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`;
  }

  private static elasticDivergenceInit(): string {
    return `${HEADER}
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

${hashFrag}
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

    float r = hash(uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;

    baseA = a;
    baseB = b;
    pertA = a + vec4(perturb_theta1, 0.0, 0.0, 0.0);
    pertB = b + vec4(perturb_theta2, 0.0, 0.0, 0.0);

    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}`;
  }

  private static rigidPhysics(): string {
    return `${HEADER}
uniform sampler2D u_stateTexture;
uniform float u_dt;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
out vec4 fragColor;

${rigidFrag}

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
}`;
  }

  private static elasticPhysics(): string {
    return `${HEADER}
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

${elasticFrag}

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
}`;
  }

  private static nonlinearPhysics(): string {
    return `${HEADER}
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

${nonlinearFrag}

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
}`;
  }

  private static rigidAccumulate(): string {
    return `${HEADER}
uniform sampler2D u_stateTexture;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${bob2Frag}

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
}`;
  }

  private static elasticAccumulate(): string {
    return `${HEADER}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${bob2Frag}

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
}`;
  }

  private static nonlinearAccumulate(): string {
    return `${HEADER}
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

${bob2Frag}

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
}`;
  }

  private static rigidDivergenceStep(): string {
    return `${HEADER}
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

${rigidFrag}
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
}`;
  }

  private static elasticDivergenceStep(): string {
    return `${HEADER}
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

${elasticFrag}
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
}`;
  }

  private static nonlinearDivergenceStep(): string {
    return `${HEADER}
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

${nonlinearFrag}
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
}`;
  }

  // ==================== Preview shaders ====================

  static buildPreviewPhysicsLoop(system: System): string {
    if (system === 'rigid') return this.previewRigidPhysicsLoop();
    if (system === 'nonlinear') return this.previewNonlinearPhysicsLoop();
    return this.previewElasticPhysicsLoop();
  }

  static buildPreviewInit(system: System): string {
    if (system === 'rigid') return this.previewRigidInit();
    if (system === 'nonlinear') return this.previewNonlinearInit();
    return this.previewElasticInit();
  }

  static buildPreviewDivergenceCheck(system: System): string {
    if (system === 'rigid') return this.previewRigidDivCheck();
    if (system === 'nonlinear') return this.previewNonlinearDivCheck();
    return this.previewElasticDivCheck();
  }

  static buildPreviewTrailAppend(system: System): string {
    if (system === 'rigid') return this.previewRigidTrailAppend();
    if (system === 'nonlinear') return this.previewNonlinearTrailAppend();
    return this.previewElasticTrailAppend();
  }

  static buildPreviewRender(system: System): string {
    if (system === 'rigid') return this.previewRigidRender();
    if (system === 'nonlinear') return this.previewNonlinearRender();
    return this.previewElasticRender();
  }

  private static previewRigidPhysicsLoop(): string {
    return `${HEADER}
uniform sampler2D u_stateTexture;
uniform float u_dt;
uniform int u_steps;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
out vec4 fragColor;

${rigidFrag}

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
}`;
  }

  private static previewElasticPhysicsLoop(): string {
    return `${HEADER}
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

${elasticFrag}

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
}`;
  }

  private static previewNonlinearPhysicsLoop(): string {
    return `${HEADER}
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

${nonlinearFrag}

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
}`;
  }

  private static previewRigidInit(): string {
    return `${HEADER}
uniform vec4 u_initialState;
uniform float u_perturb;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 pertState;

void main() {
    baseState = u_initialState;
    pertState = u_initialState + vec4(u_perturb, 0.0, u_perturb, 0.0);
}`;
  }

  private static previewElasticInit(): string {
    return `${HEADER}
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
}`;
  }

  private static previewNonlinearInit(): string {
    return this.previewElasticInit();
  }

  private static previewRigidDivCheck(): string {
    return `${HEADER}
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
}`;
  }

  private static previewElasticDivCheck(): string {
    return `${HEADER}
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
}`;
  }

  private static previewNonlinearDivCheck(): string {
    return this.previewElasticDivCheck();
  }

  private static previewRigidTrailAppend(): string {
    return `${HEADER}
uniform sampler2D u_baseState;
in vec2 v_uv;
out vec4 fragColor;

${bob2Frag}

void main() {
    vec4 state = texelFetch(u_baseState, ivec2(0, 0), 0);
    float x2, y2;
    computeBob2(state.x, state.z, 1.0, 1.0, x2, y2);
    fragColor = vec4(x2, y2, 0.0, 1.0);
}`;
  }

  private static previewElasticTrailAppend(): string {
    return `${HEADER}
uniform sampler2D u_baseA;
uniform sampler2D u_baseB;
in vec2 v_uv;
out vec4 fragColor;

${bob2Frag}

void main() {
    vec4 sa = texelFetch(u_baseA, ivec2(0, 0), 0);
    vec4 sb = texelFetch(u_baseB, ivec2(0, 0), 0);
    float theta1 = sa.x, theta2 = sb.x, r1 = sa.z, r2 = sb.z;
    float x2, y2;
    computeBob2(theta1, theta2, 1.0 + r1, 1.0 + r2, x2, y2);
    fragColor = vec4(x2, y2, 0.0, 1.0);
}`;
  }

  private static previewNonlinearTrailAppend(): string {
    return `${HEADER}
uniform sampler2D u_baseA;
uniform sampler2D u_baseB;
in vec2 v_uv;
out vec4 fragColor;

${bob2Frag}

void main() {
    vec4 sa = texelFetch(u_baseA, ivec2(0, 0), 0);
    vec4 sb = texelFetch(u_baseB, ivec2(0, 0), 0);
    float theta1 = sa.x, theta2 = sb.x, r1 = sa.z, r2 = sb.z;
    float x2, y2;
    computeBob2(theta1, theta2, 1.0 + r1, 1.0 + r2, x2, y2);
    fragColor = vec4(x2, y2, 0.0, 1.0);
}`;
  }

  private static sdfHelpers(): string {
    return `
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
`;
  }

  private static previewRigidRender(): string {
    return `${HEADER}
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
${bob2Frag}

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
}`;
  }

  private static previewElasticRender(): string {
    return `${HEADER}
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
${bob2Frag}

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
}`;
  }

  private static previewNonlinearRender(): string {
    return this.previewElasticRender();
  }

  // ==================== Batch optimizer shaders ====================

  static buildBatchInit(system: System): string {
    if (system === 'rigid') return this.batchRigidInit();
    if (system === 'nonlinear') return this.batchNonlinearInit();
    return this.batchElasticInit();
  }

  static buildBatchPhysics(system: System): string {
    if (system === 'rigid') return this.batchRigidPhysics();
    if (system === 'nonlinear') return this.batchNonlinearPhysics();
    return this.batchElasticPhysics();
  }

  private static batchHash(): string {
    return `
float batchHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}`;
  }

  private static batchRigidInit(): string {
    return `${HEADER}
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
}`;
  }

  private static batchElasticInit(): string {
    return `${HEADER}
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
}`;
  }

  private static batchNonlinearInit(): string {
    return this.batchElasticInit();
  }

  private static batchRigidPhysics(): string {
    return `${HEADER}
uniform sampler2D u_stateTexture;
uniform float u_dt;
uniform int u_steps;
uniform float u_m1;
uniform float u_m2;
uniform float u_L1;
uniform float u_L2;
in vec2 v_uv;
out vec4 fragColor;

${rigidFrag}

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
}`;
  }

  private static batchElasticPhysics(): string {
    return `${HEADER}
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

${elasticFrag}

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
}`;
  }

  private static batchNonlinearPhysics(): string {
    return `${HEADER}
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

${nonlinearFrag}

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
}`;
  }
}
