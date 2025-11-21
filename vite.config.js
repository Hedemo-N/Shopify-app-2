import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'public', // så att Vercel serverar rätt
    emptyOutDir: true,
    rollupOptions: {
      input: './src/frontend.js',
    },
  },
});
