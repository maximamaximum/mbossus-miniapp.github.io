import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mbossus-miniapp.github.io/',
  build: {
    outDir: 'dist',
  },
})
