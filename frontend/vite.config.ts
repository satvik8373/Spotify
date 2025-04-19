import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 3000,
		hmr: {
			overlay: false,
		},
		proxy: {
			'/api': {
				target: 'http://localhost:5000',
				changeOrigin: true,
				secure: false,
			}
		}
	},
	base: '/',
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		emptyOutDir: true,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom', 'react-router-dom'],
				},
			},
		},
	},
});
