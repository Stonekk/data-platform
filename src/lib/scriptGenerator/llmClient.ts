export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type LlmClientConfig = {
  model?: string
  temperature?: number
}

function apiBase(): string {
  if (import.meta.env.DEV) return '/api/llm'
  const proxy = import.meta.env.VITE_LLM_PROXY_URL as string | undefined
  if (proxy?.trim()) return proxy.replace(/\/$/, '')
  throw new Error(
    'LLM 模式需在开发环境运行（npm run dev），或配置 VITE_LLM_PROXY_URL 指向兼容 OpenAI 的代理。',
  )
}

export async function chatJson<T>(
  messages: ChatMessage[],
  config: LlmClientConfig = {},
): Promise<T> {
  const model = config.model ?? (import.meta.env.VITE_LLM_MODEL as string | undefined) ?? 'deepseek-chat'
  const base = apiBase()

  let res: Response
  try {
    res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature ?? 0.6,
        response_format: { type: 'json_object' },
      }),
    })
  } catch {
    throw new Error(
      '无法连接 LLM 代理（/api/llm）。请确认：① 使用 npm run dev 启动；② 修改 .env.local 后已重启 dev；③ DEEPSEEK_API_KEY 为平台复制的真实密钥（非 sk-你的… 占位符）。',
    )
  }

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 401 || res.status === 403 || errText.includes('Authentication Fails')) {
      throw new Error(
        'LLM 鉴权失败：DEEPSEEK_API_KEY 无效。请在 https://platform.deepseek.com/api_keys 复制完整密钥到 .env.local，保存后重启 npm run dev。',
      )
    }
    if (res.status === 402 || errText.includes('insufficient') || errText.includes('quota')) {
      throw new Error('LLM 账户额度不足，请检查 DeepSeek 余额。')
    }
    throw new Error(`LLM 请求失败 (${res.status}): ${errText.slice(0, 280)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM 返回空内容')

  try {
    return JSON.parse(content) as T
  } catch {
    throw new Error(`LLM 返回非 JSON：${content.slice(0, 200)}`)
  }
}
