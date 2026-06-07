#version 300 es
precision highp float;
uniform vec2 u_theta1Range;
uniform vec2 u_theta2Range;
uniform float u_omega1;
uniform float u_omega2;
in vec2 v_uv;
out vec4 fragColor;
void main() {
    float theta1 = mix(u_theta1Range.x, u_theta1Range.y, v_uv.x);
    float theta2 = mix(u_theta2Range.x, u_theta2Range.y, v_uv.y);
    fragColor = vec4(theta1, u_omega1, theta2, u_omega2);
}
