#version 300 es
precision highp float;
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
uniform int u_elasticMode;
in vec2 v_uv;
out vec4 fragColor;
void main() {
    vec4 sa = texture(u_stateTextureA, v_uv);
    vec4 sb = texture(u_stateTextureB, v_uv);

    float theta1, theta2, r1, r2;
    if (u_elasticMode == 0) {
        theta1 = sa.x; theta2 = sb.x;
        r1 = sa.z; r2 = 0.0;
    } else if (u_elasticMode == 1) {
        theta1 = sa.x; theta2 = sa.z;
        r1 = 0.0; r2 = sb.x;
    } else {
        theta1 = sa.x; theta2 = sb.x;
        r1 = sa.z; r2 = sb.z;
    }

    float l1 = 1.0 + r1;
    float l2 = 1.0 + r2;
    float x1 = l1 * sin(theta1);
    float y1 = -l1 * cos(theta1);
    float x2 = x1 + l2 * sin(theta2);
    float y2 = y1 - l2 * cos(theta2);

    vec4 prevData = texture(u_distanceTexture, v_uv);
    float totalDist = prevData.z;
    float valid = prevData.w;

    float newDist = (u_reset || valid < 0.5) ? 0.0 : totalDist + sqrt((x2-prevData.x)*(x2-prevData.x) + (y2-prevData.y)*(y2-prevData.y));
    fragColor = vec4(x2, y2, newDist, 1.0);
}
