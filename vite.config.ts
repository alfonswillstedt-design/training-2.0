import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Appen ligger på GitHub Pages under /training-2.0/. Utan base laddar inga
  // assets i produktion.
  base: '/training-2.0/',

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Appen öppnas, svarar och stängs. En uppdateringsfråga vore ett steg i
      // vägen, och det finns inget osparat att förlora — varje ändring skrivs
      // direkt, så en tyst uppdatering kan inte kosta något.
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // iOS läser inte manifestets ikoner, utan bara den här.
      includeAssets: ['apple-touch-icon.png'],

      manifest: {
        name: 'Träningsschemaläggare',
        short_name: 'Träning',
        description: 'Räknar ut när du kan träna, utifrån tiderna du inte rår över.',
        lang: 'sv',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf8f4',
        theme_color: '#faf8f4',
        icons: [
          { src: 'ikon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'ikon-512.png', sizes: '512x512', type: 'image/png' },
          // Egen post för maskable: Android beskär ikonen till sin egen form,
          // och motivet ligger innanför den säkra ytan.
          { src: 'ikon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // Typsnittet måste med, annars byter appen typsnitt i flygplansläge.
        globPatterns: ['**/*.{js,css,html,woff2,png}'],
      },
    }),
  ],
});
