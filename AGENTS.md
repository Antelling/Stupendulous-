# Bob2 Distance - AGENTS.md

## Project Overview

Bob2 Distance is a WebGL 2.0 visualization that tracks the total distance traveled by the second bob of a double pendulum system. Each pixel represents a different initial condition (theta1, theta2), and the color indicates how far bob2 has traveled from its starting position over time.

## Key Features

- **WebGL 2.0**: Uses modern WebGL 2.0 API with GLSL ES 3.0 shaders
- **Mobile Compatible**: Works on mobile devices (unlike WebGL 1.0 chaos-map)
- **Verlet Integration**: Symplectic integrator for energy conservation
- **Real-time Accumulation**: Distance accumulates frame-by-frame
- **6 Color Maps**: Viridis, Magma, Plasma, Inferno, Turbo, Jet

## Deployment Requirements

### Web Server

- Any static file server (Nginx, Apache, Python http.server)
- No server-side processing required
- Fully client-side WebGL 2.0 application

### Browser Requirements

- **WebGL 2.0 support** (required)
- `EXT_color_buffer_float` extension (for RGBA32F textures)
- Tested on: Chrome, Firefox, Safari, Edge, Mobile Chrome, Mobile Safari

### Local Development

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .
```

### Production Deployment

```bash
# Copy to nginx serve directory
cp -r bob2-distance/ /var/www/html/
```

No build step required - serve `index.html` as-is.

## Technical Details

### Shader Pipeline

1. **Init Shader**: Sets initial state (theta1, omega1, theta2, omega2) based on UV coordinates
2. **Physics Shader**: Velocity Verlet integration of double pendulum equations
3. **Distance Shader**: Computes bob2 position and accumulates total distance traveled
4. **Render Shader**: Maps distance values to colors using selected colormap

### Texture Format

- **State Texture**: RGBA32F - (theta1, omega1, theta2, omega2)
- **Distance Texture**: RGBA32F - (x2, y2, totalDistance, valid)

### Physics Parameters (Fixed)

- Mass 1: 1.0 kg
- Mass 2: 1.0 kg
- Length 1: 1.0 m
- Length 2: 1.0 m
- Gravity: 9.81 m/s²
