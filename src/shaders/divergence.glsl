#version 300 es
precision highp float;
uniform sampler2D u_stateTexture;
uniform sampler2D u_perturbedTexture;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform float u_threshold;
uniform int u_currentIter;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;
const float m1 = 1.0;
const float m2 = 1.0;
const float L1 = 1.0;
const float L2 = 1.0;
const float g = 9.81;
const float PI = 3.14159265359;
vec2 computeAccelerations(float theta1, float omega1, float theta2, float omega2) {
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
void verletStep(inout float theta1, inout float omega1, inout float theta2, inout float omega2) {
    vec2 accel = computeAccelerations(theta1, omega1, theta2, omega2);
    float omega1_half = omega1 + 0.5 * u_dt * accel.x;
    float omega2_half = omega2 + 0.5 * u_dt * accel.y;
    theta1 += u_dt * omega1_half;
    theta2 += u_dt * omega2_half;
    vec2 accel_new = computeAccelerations(theta1, omega1_half, theta2, omega2_half);
    omega1 = omega1_half + 0.5 * u_dt * accel_new.x;
    omega2 = omega2_half + 0.5 * u_dt * accel_new.y;
}
float circularDiff(float a, float b) {
    float d = a - b;
    return d - 2.0 * PI * floor(d / (2.0 * PI) + 0.5);
}
float measureDivergence(float t1a, float o1a, float t2a, float o2a, float t1b, float o1b, float t2b, float o2b) {
    float d1 = circularDiff(t1a, t1b);
    float d2 = circularDiff(t2a, t2b);
    return sqrt(d1*d1 + d2*d2 + (o1a-o1b)*(o1a-o1b) + (o2a-o2b)*(o2a-o2b));
}
void main() {
    vec4 base = texture(u_stateTexture, v_uv);
    vec4 pert = texture(u_perturbedTexture, v_uv);
    vec4 div = texture(u_divergenceTexture, v_uv);
    float iter = div.r;
    float hasDiv = div.g;
    verletStep(base.x, base.y, base.z, base.w);
    verletStep(pert.x, pert.y, pert.z, pert.w);
    if (hasDiv < 0.5) {
        float dist = measureDivergence(base.x, base.y, base.z, base.w, pert.x, pert.y, pert.z, pert.w);
        if (dist > u_threshold) {
            iter = float(u_currentIter);
            hasDiv = 1.0;
        }
    }
    baseState = base;
    perturbedState = pert;
    divergenceData = vec4(iter, hasDiv, 0.0, 1.0);
}
