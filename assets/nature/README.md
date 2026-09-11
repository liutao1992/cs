# Nature assets

Pine.glb, Rock Medium.glb and Bush.glb from Quaternius's Stylized Nature MegaKit,
renamed to pine.glb, rock.glb and bush.glb locally.

Downloaded from `environment/vegetation/polypizza-stylized-nature-gltf/` in
https://github.com/petroulacl/fps-buildings-env-kit at commit
`1dd8e932402deb82422920df2e7fd079391e55d3`.

Creator and license: Quaternius, CC0 1.0 / Public Domain.
https://quaternius.com/packs/stylizednaturemegakit.html
https://poly.pizza/bundle/Stylized-Nature-MegaKit-T34GZFA0fm
https://creativecommons.org/publicdomain/zero/1.0/

Run `node scripts/prepare-nature.mjs` then `npm run build` to regenerate.
Diffuse textures and vertex colors are preserved, normal textures are omitted.
Foliage uses alpha cutouts and is excluded from bullet blockers. Pine models
are centered on the base of their trunks for movement collision.
