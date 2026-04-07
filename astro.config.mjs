// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://yourblog.com',
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: vercel(),
  integrations: [sitemap()],
});
