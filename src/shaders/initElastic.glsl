#version 300 es
precision highp float;
uniform vec2 u_theta1Range;
uniform vec2 u_theta2Range;
uniform float u_omega1;
uniform float u_omega2;
uniform int u_elasticMode;
in vec2 v_uv;
layout(location = 0) out vec4 stateA;
layout(location = 1) out vec4 stateB;
void main() {
    float theta1 = mix(u_theta1Range.x, u_theta1Range.y, v_uv.x);
    float theta2 = mix(u_theta2Range.x, u_theta2Range.y, v_uv.y);
    if (u_elasticMode == 0) {
        stateA = vec4(theta1, u_omega1, 0.0, 0.0);
        stateB = vec4(theta2, u_omega2, 0.0, 1.0);
    } else if (u_elasticMode == 1) {
        stateA = vec4(theta1, u_omega1, theta2, u_omega2);
        stateB = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        stateA = vec4(theta1, u_omega1, 0.0, 0.0);
        stateB = vec4(theta2, u_omega2, 0.0, 0.0);
    }
}
