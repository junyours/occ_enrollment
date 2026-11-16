import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { fileViewerRenderers } from '@file-viewer/vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
        // Classwork file preview. Only these renderers are bundled; HTML,
        // SVG, email, archive and other formats stay download-only.
        // Laravel has no Vite HTML entry, so FilePreview imports
        // `virtual:file-viewer-renderers` itself (inject: false).
        fileViewerRenderers({
            renderers: ['pdf', 'word', 'spreadsheet', 'presentation'],
            inject: false,
            copyAssets: { baseDir: 'file-viewer' },
            // The default 'renderer' grouping pulls Vite's shared preload
            // helper into the PDF chunk, so every page would load ~1 MB.
            chunkStrategy: 'none',
        }),
    ],
    // server: {
    //     host: '10.116.205.226', // Use your local network IP
    //     port: 5173,
    //     strictPort: true,
    //     cors: {
    //         origin: 'http://10.116.205.226:8000', // Allow requests from Laravel backend
    //         credentials: true,
    //     },
    // },
});
