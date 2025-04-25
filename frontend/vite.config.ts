import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	// Load environment variables
	const env = loadEnv(mode, process.cwd(), '');
	const apiUrl = env.VITE_API_URL || 'http://localhost:5000';
	
	console.log(`Mode: ${mode}`);
	console.log(`API URL: ${apiUrl}`);
	
	return {
		plugins: [react()],
		base: '/',
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
					target: apiUrl,
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/api/, '')
				}
			}
		},
		preview: {
			port: 3000,
			proxy: {
				'/api': {
					target: apiUrl,
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/api/, '')
				}
			}
		},
		build: {
			outDir: "dist",
			assetsDir: "assets",
			sourcemap: false,
			rollupOptions: {
				output: {
					manualChunks: {
						vendor: [
							'react', 
							'react-dom', 
							'react-router-dom',
							'zustand'
						]
					}
				}
			}
		},
		define: {
			'process.env.VITE_API_URL': JSON.stringify(apiUrl)
		}
	}
});
