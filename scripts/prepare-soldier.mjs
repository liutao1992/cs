import {readFile,writeFile} from 'node:fs/promises';
const file=await readFile(new URL('../assets/soldier/Soldier.glb',import.meta.url));
await writeFile(new URL('../src/soldier-asset.js',import.meta.url),'// Embedded application asset; see assets/soldier/SOURCE.md.\nexport default '+JSON.stringify(file.toString('base64'))+';\n');
