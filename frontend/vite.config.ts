import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from 'vite-plugin-pwa';
import { compression } from 'vite-plugin-compression2';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	
	return {
		plugins: [
			react(),
			VitePWA({
				registerType: 'autoUpdate',
				workbox: {
					globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
					runtimeCaching: [
						{
							urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
							handler: 'CacheFirst',
							options: {
								cacheName: 'cloudinary-images',
								expiration: {
									maxEntries: 100,
									maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
								},
							},
						},
						{
							urlPattern: /^https:\/\/api\.spotify\.com\/.*/i,
							handler: 'NetworkFirst',
							options: {
								cacheName: 'spotify-api',
								expiration: {
									maxEntries: 50,
									maxAgeSeconds: 60 * 60 * 24, // 24 hours
								},
							},
						},
						{
							urlPattern: /^https:\/\/firebase\.googleapis\.com\/.*/i,
							handler: 'StaleWhileRevalidate',
							options: {
								cacheName: 'firebase-sdk',
								expiration: {
									maxEntries: 10,
									maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
								},
							},
						}
					],
				},
				manifest: {
					name: 'Mavrixfy - Your Ultimate Music Experience',
					short_name: 'Mavrixfy',
					description: 'High-performance music streaming with optimized mobile experience',
					theme_color: '#1DB954',
					background_color: '#18181b',
					display: 'standalone',
					orientation: 'portrait',
					scope: '/',
					start_url: '/',
					icons: [
						{
							src: '/spotify-icons/spotify-icon-192.png',
							sizes: '192x192',
							type: 'image/png',
							purpose: 'any maskable'
						},
						{
							src: '/spotify-icons/spotify-icon-512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'any maskable'
						}
					],
					shortcuts: [
						{
							name: 'Search Music',
							short_name: 'Search',
							description: 'Search for your favorite music',
							url: '/search',
							icons: [{ src: '/shortcut-search-96.png', sizes: '96x96' }]
						},
						{
							name: 'Liked Songs',
							short_name: 'Liked',
							description: 'Your liked songs collection',
							url: '/liked-songs',
							icons: [{ src: '/shortcut-liked-96.png', sizes: '96x96' }]
						}
					]
				},
				devOptions: {
					enabled: true
				}
			}),
			compression({ 
				algorithms: ['gzip'], 
				exclude: [/\.(br)$/, /\.(gz)$/],
				threshold: 1024,
				compressionOptions: { level: 9 }
			}),
			compression({ 
				algorithms: ['brotliCompress'], 
				exclude: [/\.(br)$/, /\.(gz)$/],
				threshold: 1024,
				compressionOptions: { level: 11 }
			}),
		],
		base: '/',
		resolve: {
			alias: {
				'@': '/src',
			},
		},
		build: {
			target: 'es2015',
			minify: 'terser',
			terserOptions: {
				compress: {
					drop_console: mode === 'production',
					drop_debugger: mode === 'production',
					pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
				},
				mangle: {
					toplevel: true,
				},
			},
			rollupOptions: {
				output: {
					manualChunks: {
						vendor: [
							'react',
							'react-dom',
							'react-router-dom',
							'zustand'
						],
						ui: [
							'@radix-ui/react-dialog',
							'@radix-ui/react-dropdown-menu',
							'@radix-ui/react-slider',
							'@radix-ui/react-toast'
						],
						utils: [
							'axios',
							'lucide-react',
							'react-hot-toast'
						]
					},
					chunkFileNames: (chunkInfo) => {
						const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
						return `assets/${facadeModuleId}-[hash].js`;
					},
					entryFileNames: 'assets/[name]-[hash].js',
					assetFileNames: (assetInfo) => {
						const info = assetInfo.name?.split('.') || [];
						const ext = info[info.length - 1];
						if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
							return `assets/images/[name]-[hash][extname]`;
						}
						if (/css/i.test(ext)) {
							return `assets/[name]-[hash][extname]`;
						}
						return `assets/[name]-[hash][extname]`;
					}
				},
				external: mode === 'development' ? [] : undefined,
			},
			chunkSizeWarningLimit: 1000,
			assetsInlineLimit: 4096,
			sourcemap: mode === 'development',
			reportCompressedSize: true,
			emptyOutDir: true,
		},
		define: {
			__APP_ENV__: JSON.stringify(env.APP_ENV),
		},
		server: {
			port: 3000,
			host: true,
		},
		preview: {
			port: 4173,
			host: true,
		},
		optimizeDeps: {
			include: [
				'react',
				'react-dom',
				'react-router-dom',
				'zustand',
				'axios',
				'lucide-react'
			],
			exclude: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
		},
		esbuild: {
			drop: mode === 'production' ? ['console', 'debugger'] : [],
		},
		css: {
			devSourcemap: mode === 'development',
		},
	};
});
