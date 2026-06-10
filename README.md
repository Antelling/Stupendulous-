# Stupendulous Double Pendulum

A WebGL2-based chaos visualization for double pendulum systems with real-time trajectory preview, phase space analysis, and Poincaré section visualization.

## Features

- **Chaos Map Visualization**: GPU-accelerated rendering of double pendulum divergence/distance maps
- **Real-time Trajectory Preview**: Click-to-start simulation with live pendulum animation
- **Phase Space Graphs**: 7-parameter line graph showing angles, velocities, and energies
- **Poincaré Section**: Automatic kinetic energy-based slicing revealing attractor structure
- **Multiple Systems**: Rigid, linear elastic, and nonlinear elastic double pendulum models
- **Interactive Controls**: Zoom, pan, and explore different parameter regions

## Systems

- **Rigid**: Classic double pendulum with fixed arm lengths
- **Elastic**: Linear spring model with Hooke's law
- **Nonlinear**: Exponential stiffening spring model

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Built files are in `dist/` and deployed to GitHub Pages.

## License

MIT
