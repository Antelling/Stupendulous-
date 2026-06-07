#version 300 es
precision highp float;
uniform sampler2D u_stateTexture;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

void main() {
    vec4 state = texture(u_stateTexture, v_uv);
    float theta1 = state.x, theta2 = state.z;
    
    const float L1 = 1.0, L2 = 1.0;
    float x1 = L1 * sin(theta1);
    float y1 = -L1 * cos(theta1);
    float x2 = x1 + L2 * sin(theta2);
    float y2 = y1 - L2 * cos(theta2);
    
    vec4 prevData = texture(u_distanceTexture, v_uv);
    float totalDist = prevData.z;
    float valid = prevData.w;
    
    float newDist = (u_reset || valid < 0.5) ? 0.0 : totalDist + sqrt((x2-prevData.x)*(x2-prevData.x) + (y2-prevData.y)*(y2-prevData.y));
    fragColor = vec4(x2, y2, newDist, 1.0);
}
