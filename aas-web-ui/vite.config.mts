import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
// Uncomment the line below to enable HTTPS on the dev server.
// Requires the BaSyx infrastructure to also serve over HTTPS to avoid mixed content errors.
// import basicSsl from '@vitejs/plugin-basic-ssl'
import Vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Fonts from 'unplugin-fonts/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv } from 'vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { vueAutoImportPreset } from './config/auto-imports.js'

function copyWebIfcWasmPlugin () {
  return {
    name: 'copy-web-ifc-wasm',
    buildStart () {
      const sourceDir = 'node_modules/web-ifc'
      const targetDir = 'public/wasm'

      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true })
      }

      const wasmFiles = ['web-ifc.wasm', 'web-ifc-mt.wasm', 'web-ifc-node.wasm']

      for (const file of wasmFiles) {
        const sourcePath = join(sourceDir, file)
        const targetPath = join(targetDir, file)

        if (existsSync(sourcePath)) {
          copyFileSync(sourcePath, targetPath)
        }
      }
    },
  }
}

function getCommitSha (): string {
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

/**
 * LOCAL DEV ONLY (revert before Docker build):
 * Rewriting reverse-proxy for /aas/api/* and /aas/docs/* requests.
 * Forwards to the upstream backend and rewrites the absolute origin in
 * JSON responses to empty string, making the app treat all endpoint URLs
 * as same-origin relative paths (avoids both CORS and the app's trust check).
 */
function aasApiProxyPlugin (upstreamUrl: string, localOrigin: string) {
  const PREFIXES = ['/aas/api/', '/aas/docs/']
  return {
    name: 'aas-api-rewrite-proxy',
    configureServer (server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || ''
        if (!PREFIXES.some((p: string) => url.startsWith(p))) return next()

        const upstream = upstreamUrl + url
        try {
          const method = req.method || 'GET'
          let body: Buffer | undefined
          if (!['GET', 'HEAD'].includes(method)) {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            body = Buffer.concat(chunks)
          }

          const hdrs: Record<string, string> = {}
          for (const [k, v] of Object.entries(req.headers)) {
            if (['host', 'connection', 'accept-encoding'].includes(k.toLowerCase())) continue
            if (typeof v === 'string') hdrs[k] = v
            else if (Array.isArray(v)) hdrs[k] = v.join(', ')
          }

          const upstreamRes = await fetch(upstream, {
            method,
            headers: hdrs,
            body: body && body.length > 0 ? body : undefined,
            redirect: 'follow',
          })

          res.statusCode = upstreamRes.status
          upstreamRes.headers.forEach((value, key) => {
            if (!['transfer-encoding', 'content-encoding', 'content-length', 'connection'].includes(key.toLowerCase())) {
              res.setHeader(key, value)
            }
          })

          const ct = upstreamRes.headers.get('content-type') || ''
          if (ct.includes('application/json') || ct.includes('text/')) {
            const text = await upstreamRes.text()
            // Rewrite the upstream origin to the LOCAL DEV origin (same-origin),
            // NOT to an empty string. An empty rewrite turns absolute file
            // values (e.g. https://aas-demo.../aas/docs/x.pdf) into *relative*
            // paths (/aas/docs/x.pdf); the app's File.valueUrl() can then not
            // parse them and falls back to the in-repository /attachment
            // endpoint, which BaSyx 400s for URL-backed files ("Error
            // retrieving File!"). Same-origin absolute URLs keep valueUrl() on
            // its fast path and pass the app's origin trust check.
            const rewritten = text.split(upstreamUrl).join(localOrigin)
            res.setHeader('content-length', String(Buffer.byteLength(rewritten)))
            res.end(rewritten)
          } else {
            const buf = Buffer.from(await upstreamRes.arrayBuffer())
            res.setHeader('content-length', String(buf.byteLength))
            res.end(buf)
          }
        } catch (e: any) {
          res.statusCode = 502
          res.setHeader('content-type', 'text/plain')
          res.end(`Proxy error: ${e.message}`)
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }
  const isProduction = mode === 'production'
  const base = isProduction ? process.env.BASE || '/__BASE_PATH_PLACEHOLDER__/' : '/'
  const version = process.env.VITE_APP_VERSION || 'dev'
  const commitSha = process.env.VITE_APP_COMMIT_SHA || getCommitSha()
  const buildDate = process.env.VITE_APP_BUILD_DATE || new Date().toISOString()

  return {
    plugins: [
      // basicSsl(), // Uncomment to enable HTTPS — requires BaSyx infrastructure to also support HTTPS
      copyWebIfcWasmPlugin(),
      // LOCAL DEV ONLY (revert before Docker build): rewriting proxy to backend.
      // File/attachment URLs in JSON responses are rewritten from the upstream
      // origin to the local dev origin (same-origin) so the app fetches them
      // through this proxy (see aasApiProxyPlugin).
      aasApiProxyPlugin(
        process.env.AAS_API_UPSTREAM_URL || 'https://aas-demo.p2o-lab.ifa.et.tu-dresden.de',
        process.env.AAS_API_LOCAL_ORIGIN || 'http://localhost:3000',
      ),
      AutoImport({
        imports: [vueAutoImportPreset],
        dts: 'src/auto-imports.d.ts',
        eslintrc: {
          enabled: true,
        },
        vueTemplate: true,
      }),
      Components({
        dts: 'src/components.d.ts',
      }),
      Vue({
        template: { transformAssetUrls },
      }),
      // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
      Vuetify({
        autoImport: true,
        styles: {
          configFile: 'src/styles/settings.scss',
        },
      }),
      Fonts({
        fontsource: {
          families: [
            {
              name: 'Roboto',
              weights: [100, 300, 400, 500, 700, 900],
              styles: ['normal', 'italic'],
            },
          ],
        },
      }),
    ],
    base,
    define: {
      'process.env': {
        NODE_ENV: mode,
      },
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
      'import.meta.env.VITE_APP_COMMIT_SHA': JSON.stringify(commitSha),
      'import.meta.env.VITE_APP_BUILD_DATE': JSON.stringify(buildDate),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('src', import.meta.url)),
      },
      extensions: [
        '.js',
        '.json',
        '.jsx',
        '.mjs',
        '.ts',
        '.tsx',
        '.vue',
      ],
    },
    optimizeDeps: {
      /**
       * Monaco is loaded lazily through auto-imported editor components.
       * Discover its runtime entries at startup to avoid an optimizer-triggered page reload.
       */
      include: [
        'monaco-editor/editor',
        'monaco-editor/features/register.all',
        'monaco-editor/languages/definitions/xml/register',
        'monaco-editor/languages/features/json/register',
      ],
    },
    server: {
      port: 3000,
      hmr: true,
      proxy: {
        '/api/catena-x/edc': {
          target: process.env.CX_EDC_BFF_UPSTREAM_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
