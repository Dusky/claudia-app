import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // You can specify CSS handling options here if needed, for example:
    // css: true, 
    // or if you use CSS modules and want them to be accessible in tests:
    // css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
