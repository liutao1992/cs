# 环境纹理来源(CC0)

照片级 PBR 纹理,均为 CC0 协议,可自由使用。albedo 为 1K,normal 已缩到 512。

| 文件 | 原始素材 | 来源 |
| --- | --- | --- |
| clay-plaster-* | clay_plaster | Poly Haven |
| yellow-bricks-* | yellow_bricks | Poly Haven |
| sandstone-blocks-* | large_sandstone_blocks | Poly Haven |
| plaster-* | Plaster001 | ambientCG |
| sand-ground-* | Ground054 | ambientCG |
| grass-* | Grass003 | ambientCG |
| wood-* | Wood026 | ambientCG |
| concrete-* | Concrete034 | ambientCG |

- https://polyhaven.com (CC0)
- https://ambientcg.com (CC0)

重新打包:`node scripts/prepare-textures.mjs` 将本目录压缩图编码进
`src/textures-asset.js`(base64 内嵌,保证单 HTML 离线可玩)。
