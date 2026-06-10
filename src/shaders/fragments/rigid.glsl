// Rigid double pendulum ODE right-hand side
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
