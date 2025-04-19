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
	build: {
		outDir: 'dist',
		sourcemap: true,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom', 'react-router-dom'],
				},
			},
		},
	},
	server: {
		port: 3000,
		open: true,
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
	define: {
		'process.env': process.env,
	},
});
