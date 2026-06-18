import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'path'

function sanitizeApiKey(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().replace(/^['"]|['"]$/g, '').replace(/[\r\n]/g, '')
}

function isValidApiKey(key: string): boolean {
  return key.length > 20 && /^[\x21-\x7E]+$/.test(key)
}

/** .env.local 优先于 shell 里的 DEEPSEEK_API_KEY（避免终端占位符覆盖文件） */
function readEnvFileKey(fileName: string, key: string): string {
  try {
    const text = fs.readFileSync(path.resolve(process.cwd(), fileName), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const name = trimmed.slice(0, eq).trim()
      if (name === key) return sanitizeApiKey(trimmed.slice(eq + 1))
    }
  } catch {
    // file missing
  }
  return ''
}

function resolveLlmApiKey(env: Record<string, string>): string {
  const fromFile =
    readEnvFileKey('.env.local', 'DEEPSEEK_API_KEY') ||
    readEnvFileKey('.env', 'DEEPSEEK_API_KEY')
  if (fromFile) return fromFile
  return sanitizeApiKey(env.DEEPSEEK_API_KEY ?? env.VITE_DEEPSEEK_API_KEY)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const llmApiKey = resolveLlmApiKey(env)
  const llmApiBase = (env.VITE_LLM_API_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, '')

  if (env.VITE_SCRIPT_GENERATOR_MODE === 'llm') {
    if (!isValidApiKey(llmApiKey)) {
      console.warn(
        '[llm] DEEPSEEK_API_KEY 无效：请在 .env.local 填入平台复制的纯 ASCII 密钥（勿含中文占位符），然后重启 dev。',
      )
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/llm': {
          target: llmApiBase,
          changeOrigin: true,
          rewrite: (reqPath) => reqPath.replace(/^\/api\/llm/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (isValidApiKey(llmApiKey)) {
                proxyReq.setHeader('Authorization', `Bearer ${llmApiKey}`)
              }
            })
            proxy.on('error', (err, _req, res) => {
              console.error('[llm proxy]', err.message)
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    error: 'LLM 代理连接失败，请检查 DEEPSEEK_API_KEY 与网络。',
                  }),
                )
              }
            })
          },
        },
      },
    },
  }
})
