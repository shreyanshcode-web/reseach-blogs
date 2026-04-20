import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'react-core'
          }

          if (
            id.includes('/three/')
          ) {
            return 'three-core'
          }

          if (
            id.includes('@react-three/fiber') ||
            id.includes('@react-three/drei') ||
            id.includes('@react-three/postprocessing') ||
            id.includes('postprocessing') ||
            id.includes('@react-spring/three') ||
            id.includes('@use-gesture')
          ) {
            return 'three-helpers'
          }

          if (
            id.includes('@blocknote/core')
          ) {
            return 'blocknote-core'
          }

          if (
            id.includes('@blocknote/react')
          ) {
            return 'blocknote-react'
          }

          if (
            id.includes('@blocknote/mantine') ||
            id.includes('@mantine')
          ) {
            return 'blocknote-ui'
          }

          if (
            id.includes('@clerk')
          ) {
            return 'auth-stack'
          }

          if (
            id.includes('framer-motion') ||
            id.includes('gsap') ||
            id.includes('lenis')
          ) {
            return 'motion-stack'
          }

          return 'vendor'
        },
      },
    },
  },
})
