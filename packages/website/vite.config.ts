import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sentrySvelteKit({
			sourceMapsUploadOptions: {
				org: 'revelationsai',
				project: 'svelte-kit',
				authToken: process.env.SENTRY_AUTH_TOKEN,
				cleanArtifacts: true
			}
		}),
		sveltekit()
	]
});
