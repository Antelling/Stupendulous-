#version 300 es
precision highp float;

uniform sampler2D u_dataTexture;
uniform int u_colormap;
uniform int u_toneMapping;
uniform float u_maxValue;
uniform int u_vizMode;

in vec2 v_uv;
out vec4 fragColor;

vec3 viridis(float t) {
    vec3 c0 = vec3(68.0/255.0, 1.0/255.0, 84.0/255.0);
    vec3 c1 = vec3(33.0/255.0, 145.0/255.0, 140.0/255.0);
    vec3 c2 = vec3(253.0/255.0, 231.0/255.0, 37.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 magma(float t) {
    vec3 c0 = vec3(4.0/255.0, 5.0/255.0, 9.0/255.0);
    vec3 c1 = vec3(148.0/255.0, 52.0/255.0, 110.0/255.0);
    vec3 c2 = vec3(252.0/255.0, 253.0/255.0, 191.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 plasma(float t) {
    vec3 c0 = vec3(13.0/255.0, 8.0/255.0, 135.0/255.0);
    vec3 c1 = vec3(156.0/255.0, 23.0/255.0, 158.0/255.0);
    vec3 c2 = vec3(240.0/255.0, 249.0/255.0, 33.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 inferno(float t) {
    vec3 c0 = vec3(0.0/255.0, 0.0/255.0, 4.0/255.0);
    vec3 c1 = vec3(187.0/255.0, 55.0/255.0, 84.0/255.0);
    vec3 c2 = vec3(252.0/255.0, 255.0/255.0, 164.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 turbo(float t) {
    float r = clamp((48.0 + 227.0 * sin((t - 0.5) * 3.14159265)) / 255.0, 0.0, 1.0);
    float g = clamp((t < 0.5 ? t * 400.0 : (1.0 - t) * 400.0) / 255.0, 0.0, 1.0);
    float b = clamp((128.0 + 127.0 * cos(t * 3.14159265)) / 255.0, 0.0, 1.0);
    return vec3(r, g, b);
}

vec3 jet(float t) {
    float r = clamp(t < 0.5 ? 0.0 : (t - 0.5) * 2.0, 0.0, 1.0);
    float g = clamp(t < 0.25 ? t * 4.0 : t < 0.75 ? 1.0 : (1.0 - t) * 4.0, 0.0, 1.0);
    float b = clamp(t < 0.5 ? (0.5 - t) * 2.0 : 0.0, 0.0, 1.0);
    return vec3(r, g, b);
}

vec3 rainbow(float t) {
    float hue = (1.0 - t) * 0.85;
    float s = 1.0, v = 1.0;
    float c = v * s;
    float x = c * (1.0 - abs(mod(hue * 6.0, 2.0) - 1.0));
    float m = v - c;
    vec3 rgb;
    if (hue < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (hue < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (hue < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (hue < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (hue < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}

vec3 applyColormap(float t, int mode) {
    if (mode == 0) return viridis(t);
    else if (mode == 1) return magma(t);
    else if (mode == 2) return plasma(t);
    else if (mode == 3) return inferno(t);
    else if (mode == 4) return turbo(t);
    else if (mode == 5) return jet(t);
    else return rainbow(t);
}

void main() {
    vec4 data = texture(u_dataTexture, v_uv);
    float value;
    
    if (u_vizMode == 1) {
        value = data.r;
        if (value <= 0.0) {
            fragColor = vec4(1.0, 1.0, 1.0, 1.0);
            return;
        }
    } else if (u_vizMode == 2) {
        if (data.w < 0.5) {
            fragColor = vec4(1.0, 1.0, 1.0, 1.0);
            return;
        }
        value = data.z;
    } else {
        value = data.z;
        if (data.w < 0.5) {
            fragColor = vec4(0.1, 0.1, 0.1, 1.0);
            return;
        }
    }
    
    float t;
    if (u_toneMapping == 0) {
        t = value / u_maxValue;
    } else if (u_toneMapping == 1) {
        t = log(1.0 + value) / log(1.0 + u_maxValue);
    } else if (u_toneMapping == 2) {
        t = sqrt(value / u_maxValue);
    } else {
        float x = value / u_maxValue;
        t = x * x * (3.0 - 2.0 * x);
    }
    
    t = clamp(t, 0.0, 1.0);
    vec3 color = applyColormap(1.0 - t, u_colormap);
    fragColor = vec4(color, 1.0);
}
