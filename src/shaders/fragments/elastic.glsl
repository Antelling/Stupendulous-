// Elastic double pendulum ODE right-hand side
// Requires uniforms: float u_k1, float u_k2, int u_elasticMode
// Defines: systemDeriv(sa, sb, out da, out db)

const float M1 = 1.0;
const float M2 = 1.0;
const float G  = 9.81;
const float TOTAL_M = M1 + M2;
const float L10 = 1.0;
const float L20 = 1.0;

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

void systemDerivA(
    float theta1, float omega1, float r1, float rdot1,
    float theta2, float omega2,
    out vec4 da, out vec4 db
) {
    float l1 = L10 + r1;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float l1sq = l1 * l1;
    float L2sq = L20 * L20;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat3 M;
    M[0][0] = TOTAL_M * l1sq;       M[0][1] = 0.0;                   M[0][2] = M2 * L20 * l1 * cosD;
    M[1][0] = 0.0;                   M[1][1] = TOTAL_M;               M[1][2] = M2 * L20 * sinD;
    M[2][0] = M2 * L20 * l1 * cosD; M[2][1] = M2 * L20 * sinD;      M[2][2] = M2 * L2sq;

    vec3 f;
    f.x = -2.0 * TOTAL_M * l1 * rdot1 * omega1
          - M2 * L20 * l1 * w2sq * sinD
          - TOTAL_M * G * l1 * sin(theta1);
    f.y = TOTAL_M * l1 * w1sq
          + M2 * L20 * w2sq * cosD
          + TOTAL_M * G * cos(theta1)
          - u_k1 * r1;
    f.z = -2.0 * M2 * L20 * rdot1 * omega1 * cosD
          + M2 * L20 * l1 * w1sq * sinD
          - M2 * G * L20 * sin(theta2);

    vec3 accel = solveCramer3(M, f);
    da = vec4(omega1, accel.x, rdot1, accel.y);
    db = vec4(omega2, accel.z, 0.0, 0.0);
}

void systemDerivB(
    float theta1, float omega1,
    float theta2, float omega2, float r2, float rdot2,
    out vec4 da, out vec4 db
) {
    float l2 = L20 + r2;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float L1sq = L10 * L10;
    float l2sq = l2 * l2;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat3 M;
    M[0][0] = TOTAL_M * L1sq;        M[0][1] = M2 * L10 * l2 * cosD; M[0][2] = -M2 * L10 * sinD;
    M[1][0] = M2 * L10 * l2 * cosD;  M[1][1] = M2 * l2sq;            M[1][2] = 0.0;
    M[2][0] = -M2 * L10 * sinD;      M[2][1] = 0.0;                   M[2][2] = M2;

    vec3 f;
    f.x = -2.0 * M2 * L10 * rdot2 * omega2 * cosD
          - M2 * L10 * l2 * w2sq * sinD
          - TOTAL_M * G * L10 * sin(theta1);
    f.y = -2.0 * M2 * l2 * rdot2 * omega2
          + M2 * L10 * l2 * w1sq * sinD
          - M2 * G * l2 * sin(theta2);
    f.z = M2 * l2 * w2sq
          + M2 * L10 * w1sq * cosD
          + M2 * G * cos(theta2)
          - u_k2 * r2;

    vec3 accel = solveCramer3(M, f);
    da = vec4(omega1, accel.x, 0.0, 0.0);
    db = vec4(omega2, accel.y, rdot2, accel.z);
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

void systemDerivC(
    float theta1, float omega1, float r1, float rdot1,
    float theta2, float omega2, float r2, float rdot2,
    out vec4 da, out vec4 db
) {
    float l1 = L10 + r1;
    float l2 = L20 + r2;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float l1sq = l1 * l1;
    float l2sq = l2 * l2;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat4 M;
    M[0][0] = TOTAL_M * l1sq; M[0][1] = 0.0;                M[0][2] = M2 * l1 * l2 * cosD; M[0][3] = -M2 * l1 * sinD;
    M[1][0] = 0.0;            M[1][1] = TOTAL_M;             M[1][2] = M2 * l2 * sinD;      M[1][3] = M2 * cosD;
    M[2][0] = M2*l1*l2*cosD;  M[2][1] = M2 * l2 * sinD;     M[2][2] = M2 * l2sq;            M[2][3] = 0.0;
    M[3][0] = -M2 * l1*sinD;  M[3][1] = M2 * cosD;          M[3][2] = 0.0;                  M[3][3] = M2;

    vec4 f;
    f.x = -2.0 * TOTAL_M * l1 * rdot1 * omega1
          - 2.0 * M2 * l1 * rdot2 * omega2 * cosD
          - M2 * l1 * l2 * w2sq * sinD
          - TOTAL_M * G * l1 * sin(theta1);
    f.y = TOTAL_M * l1 * w1sq
          + M2 * l2 * w2sq * cosD
          - 2.0 * M2 * rdot2 * omega2 * sinD
          + TOTAL_M * G * cos(theta1)
          - u_k1 * r1;
    f.z = -2.0 * M2 * l2 * rdot1 * omega1 * cosD
          - 2.0 * M2 * l2 * rdot2 * omega2
          + M2 * l1 * l2 * w1sq * sinD
          - M2 * G * l2 * sin(theta2);
    f.w = 2.0 * M2 * rdot1 * omega1 * sinD
          + M2 * l1 * w1sq * cosD
          + M2 * l2 * w2sq
          + M2 * G * cos(theta2)
          - u_k2 * r2;

    vec4 accel = solveCramer4(M, f);
    da = vec4(omega1, accel.x, rdot1, accel.y);
    db = vec4(omega2, accel.z, rdot2, accel.w);
}

void systemDeriv(vec4 sa, vec4 sb, out vec4 da, out vec4 db) {
    if (u_elasticMode == 0) {
        systemDerivA(sa.x, sa.y, sa.z, sa.w, sb.x, sb.y, da, db);
    } else if (u_elasticMode == 1) {
        systemDerivB(sa.x, sa.y, sb.x, sb.y, sb.z, sb.w, da, db);
    } else {
        systemDerivC(sa.x, sa.y, sa.z, sa.w, sb.x, sb.y, sb.z, sb.w, da, db);
    }
}
