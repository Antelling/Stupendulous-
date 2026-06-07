#version 300 es
precision highp float;
uniform vec2 u_theta1Range;
uniform vec2 u_theta2Range;
uniform float u_omega1;
uniform float u_omega2;
uniform float u_perturb;
uniform float u_seed;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
    float theta1 = mix(u_theta1Range.x, u_theta1Range.y, v_uv.x);
    float theta2 = mix(u_theta2Range.x, u_theta2Range.y, v_uv.y);
    float r = hash(v_uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(v_uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;
    baseState = vec4(theta1, u_omega1, theta2, u_omega2);
    perturbedState = vec4(theta1 + perturb_theta1, u_omega1, theta2 + perturb_theta2, u_omega2);
    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}
