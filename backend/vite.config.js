import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            publicDirectory: 'public',
            buildDirectory: 'build',
            refresh: true,
        }),
        react({ include: /\.(ts|tsx)$/ }),
    ],
    build: {
        manifest: true, // Generate manifest.json file
        outDir: 'public/build',
        rollupOptions: {
            input: 'resources/js/app.tsx',
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
                manualChunks: undefined, // Disable automatic chunk splitting
            },
        },
    },
    server: {
        hmr: {
            host: 'localhost',
        },
    },
});