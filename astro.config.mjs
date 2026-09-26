import { defineConfig } from 'astro/config';

const photoswipePinchSensitivity = {
  name: 'photoswipe-pinch-sensitivity',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('/photoswipe/dist/photoswipe.esm.js') && !id.includes('\\photoswipe\\dist\\photoswipe.esm.js')) return;

    const pinchScale = '1 / getDistanceBetween(startP1, startP2) * getDistanceBetween(p1, p2)';
    if (!code.includes(pinchScale)) {
      throw new Error('PhotoSwipe pinch formula changed; review the pinch sensitivity override.');
    }

    return code.replace(pinchScale, 'Math.pow(getDistanceBetween(p1, p2) / getDistanceBetween(startP1, startP2), 1.7)');
  },
};

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
  server: { port: 4321 },
  vite: {
    optimizeDeps: { exclude: ['photoswipe'] },
    plugins: [photoswipePinchSensitivity],
  },
});
