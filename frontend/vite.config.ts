// Node 16 compatibility: provide WebCrypto for Vite runtime that expects global crypto
// Safe no-op on newer Node versions where globalThis.crypto already exists
import { webcrypto as nodeWebCrypto } from 'crypto';

if (!(globalThis as any).crypto && nodeWebCrypto) {
  // Use 'typeof globalThis.crypto' to avoid TS error about 'Crypto' not being found
  (globalThis as any).crypto = nodeWebCrypto;
}

import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	// Load environment variables
	const env = loadEnv(mode, process.cwd(), '');
	const apiUrl = env.VITE_API_URL || 'http://localhost:5000';
	const cloudinaryName = env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'djqq8kba8';
	const cloudinaryPreset = env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'spotify_clone';
	const cloudinaryKey = env.REACT_APP_CLOUDINARY_API_KEY || '';
	const cloudinarySecret = env.REACT_APP_CLOUDINARY_API_SECRET || '';
	
	const isProduction = mode === 'production';
	
	return {
		plugins: [
			react({
				// Optimize React plugin for production
				babel: isProduction ? {
					plugins: [
						['babel-plugin-react-remove-properties', { properties: ['data-testid'] }]
					]
				} : undefined
			})
		],
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
			minify: 'esbuild',
			cssCodeSplit: true,
			modulePreload: { polyfill: false }, // Disable for faster builds
			target: 'es2020', // More modern target for smaller bundles
			commonjsOptions: { 
				transformMixedEsModules: true,
				include: [/node_modules/]
			},
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						// More aggressive chunking for better caching
						if (id.includes('node_modules')) {
							if (id.includes('react') || id.includes('react-dom')) {
								return 'react-vendor';
							}
							if (id.includes('@radix-ui') || id.includes('@mui')) {
								return 'ui-vendor';
							}
							if (id.includes('firebase') || id.includes('axios')) {
								return 'api-vendor';
							}
							if (id.includes('framer-motion') || id.includes('gsap')) {
								return 'animation-vendor';
							}
							return 'vendor';
						}
					},
					chunkFileNames: 'assets/[name]-[hash].js',
					entryFileNames: 'assets/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash].[ext]'
				},
				// Reduce bundle analysis time
				treeshake: {
					preset: 'recommended'
				}
			},
			chunkSizeWarningLimit: 1000,
			assetsInlineLimit: 2048, // Smaller inline limit for faster builds
			// Optimize for build speed
			reportCompressedSize: false, // Skip gzip size reporting
			emptyOutDir: true
		},
		define: {
			'process.env.VITE_API_URL': JSON.stringify(apiUrl),
			'process.env.REACT_APP_CLOUDINARY_CLOUD_NAME': JSON.stringify(cloudinaryName),
			'process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET': JSON.stringify(cloudinaryPreset),
			'process.env.REACT_APP_CLOUDINARY_API_KEY': JSON.stringify(cloudinaryKey),
			'process.env.REACT_APP_CLOUDINARY_API_SECRET': JSON.stringify(cloudinarySecret)
		},
		esbuild: {
			// Optimize esbuild for production
			drop: isProduction ? ['console', 'debugger'] : [],
			legalComments: 'none',
			treeShaking: true
		},
		// Optimize dependency pre-bundling
		optimizeDeps: {
			include: [
				'react',
				'react-dom',
				'react-router-dom',
				'axios',
				'zustand',
				'firebase/app',
				'firebase/auth',
				'firebase/firestore'
			],
			exclude: [
				// Exclude heavy dependencies that don't need pre-bundling
				'@mui/icons-material'
			]
		}
	}
});
