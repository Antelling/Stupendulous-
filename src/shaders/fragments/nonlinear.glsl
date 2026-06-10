// Nonlinear elastic double pendulum ODE right-hand side
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
