import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// __dirname gibt es in ESM nicht. Bisher lief das nur durch, weil Vite die
// Konfiguration nach CJS übersetzt — verlässt sich also auf ein Implementierungsdetail.
const projectDir = dirname(fileURLToPath(import.meta.url))

// Плагин: при каждом билде вставляет timestamp в sw.js как версию кэша
const injectSwVersion = () => ({
  name: 'inject-sw-version',
  closeBundle() {
    const swPath = resolve(projectDir, 'dist/sw.js')
    try {
      const version = Date.now().toString()
      let sw = readFileSync(swPath, 'utf-8')
      sw = sw.replace("self.__CACHE_VERSION__ || 'dev'", `'${version}'`)
      writeFileSync(swPath, sw)
      console.log(`SW cache version: ${version}`)
    } catch (e) {
      console.warn('Could not inject SW version:', e.message)
    }
  }
})

export default defineConfig({
  plugins: [react(), injectSwVersion()],
})
