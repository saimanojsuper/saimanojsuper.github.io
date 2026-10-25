import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

function githubPagesBase(): string {
  if (process.env.VITE_BASE_PATH) {
    const path = process.env.VITE_BASE_PATH
    return `/${path.replace(/^\/+|\/+$/g, '')}/`
  }

  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (process.env.GITHUB_ACTIONS && repository) {
    return repository.endsWith('.github.io') ? '/' : `/${repository}/`
  }

  return '/'
}

export default defineConfig({
  base: githubPagesBase(),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
