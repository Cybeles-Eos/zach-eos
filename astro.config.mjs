// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: "https://zach-eos.vercel.app",
	devToolbar: {
		enabled: false,
	},
	redirects: {
		"/experiences": "/journey",
	},
});
