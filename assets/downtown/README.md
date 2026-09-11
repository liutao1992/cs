# Downtown City MegaKit — selected Standard assets

Author: Quaternius. License: CC0 1.0, original License_Standard.txt included.
Source: https://quaternius.itch.io/downtown-city-megakit
Official pack: https://quaternius.com/packs/downtowncitymegakit.html

Downloaded the free Standard ZIP (upload 17615373, May 20, 2026 release).
Selected three complete example buildings and two road modules from
`Exports/glTF (Godot)/`, with only their referenced textures. No paid Source
content is used. All other archive contents remain outside the project.

Rebuild: `node scripts/prepare-downtown.mjs` (requires macOS sips), then
`npm run build`. Original glTF, binary buffers and referenced textures are
retained here. `optimized/` contains generated textures: base color/interior
JPEGs at up to 1024 px, normal/decals PNGs at up to 1024 px, packed ORM PNGs
at up to 512 px. Runtime geometry uses binary attribute arrays in base64.

The map supports outdoor street combat. Building interiors are closed to
movement. Exported glass and static window textures are retained; Source-only
parallax interiors and vertex-driven wear shaders are not implemented.
