import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [template, css, bundle, license] = await Promise.all([
  readFile(new URL('../src/index.template.html', import.meta.url), 'utf8'),
  readFile(new URL('../style.css', import.meta.url), 'utf8'),
  build({
    absWorkingDir: root,
    entryPoints: ['src/main.js'],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: ['chrome100', 'firefox100', 'safari15.4'],
    // This plain JavaScript project must not inherit configs outside its root.
    tsconfigRaw: {},
    minify: true,
    legalComments: 'inline',
    write: false,
  }),
  readFile(new URL('../node_modules/three/LICENSE', import.meta.url), 'utf8'),
]);

// Use replacement callbacks so JavaScript's literal "$&" and "$'" stay intact.
const html = template
  .replace(/<link rel="stylesheet" href="style\.css">/, () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
  .replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '')
  .replace(/<script type="module" src="src\/main\.js"><\/script>/, () => `<script>${bundle.outputFiles[0].text}</script>`)
  .replace(/<a class="brand" href="\.\/">/, '<a class="brand" href="">')
  .replace('</head>', () => `<!-- Three.js license\n${license.replaceAll('--', '—')}-->\n</head>`);

if (/<script[^>]+\bsrc=|<link[^>]+rel="stylesheet"|type="importmap"/.test(html)) {
  throw new Error('Standalone build still contains external script or stylesheet references');
}
await writeFile(new URL('../index.html', import.meta.url), html);
console.log(`Built standalone index.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB). Double-click to play offline.`);
