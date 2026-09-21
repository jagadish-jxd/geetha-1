import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        memory: resolve(__dirname, 'memory.html'),
        message: resolve(__dirname, 'message.html'),
      },
    },
  },
})