# Suburban map assets

Selected from https://github.com/petroulacl/fps-buildings-env-kit at commit
`1dd8e932402deb82422920df2e7fd079391e55d3`.

- Buildings, tree and suburban.png: `buildings/kenney-city-kit-suburban/Models/GLB format/` (texture from `Textures/colormap.png`).
- Roads and roads.png: `props/kenney-city-kit-roads/Models/GLB format/` (texture from `Textures/colormap.png`).
- Creator: Kenney, https://kenney.nl. CC0; original licenses included alongside the files.

Run `node scripts/prepare-suburban.mjs` then `npm run build` to regenerate
the baked geometry and offline HTML. Geometry is centered horizontally and
grounded at y=0; original models and atlas textures are retained here.
