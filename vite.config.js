import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
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
