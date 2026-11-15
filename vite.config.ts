import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const walk = (dir: string, base = ''): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name); const relative = base ? `${base}/${name}` : name;
  return statSync(path).isDirectory() ? walk(path, relative) : [relative];
});

/**
 * Writes `dist/sw.js` after the build: the template in `src/pwa/sw.template.js` with the list
 * of every built file (the precache) and a version derived from their contents.
 */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'mive-service-worker',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    closeBundle() {
      const files = walk(outDir).filter(file => file !== 'sw.js' && !/\.(map|woff)$/.test(file)).sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
      const template = readFileSync('src/pwa/sw.template.js', 'utf8');
      const urls = ['/', ...files.map(file => `/${file}`)];
      writeFileSync(join(outDir, 'sw.js'), template.replace("'__VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12))).replace('= __PRECACHE__;', `= ${JSON.stringify(urls)};`));
    }
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  build: {
    target: 'es2022',
    rollupOptions: { output: { manualChunks: id => id.includes('node_modules/react') || id.includes('node_modules/scheduler') ? 'react' : undefined } }
  }
});
