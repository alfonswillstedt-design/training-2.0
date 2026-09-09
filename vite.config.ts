import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Appen ligger på GitHub Pages under /training-2.0/. Utan base laddar inga
  // assets i produktion.
  base: '/training-2.0/',
  plugins: [react(), tailwindcss()],
});
