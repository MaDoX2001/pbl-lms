import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'pdf-vendor': ['jspdf', 'pdfjs-dist'],
          'utils-vendor': ['axios', 'react-toastify', 'react-use', 'socket.io-client', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
