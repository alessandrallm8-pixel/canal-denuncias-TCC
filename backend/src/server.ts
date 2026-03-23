import { createApp } from './app.js'

function parseTimeoutMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

const app = createApp()
const port = Number(process.env.PORT ?? 3000)
const requestTimeoutMs = parseTimeoutMs(process.env.BACKEND_REQUEST_TIMEOUT_MS, 35000)
const headersTimeoutMs = parseTimeoutMs(process.env.BACKEND_HEADERS_TIMEOUT_MS, 40000)

const server = app.listen(port, () => {
  console.log(`Backend executando na porta ${port}`)
})

server.requestTimeout = requestTimeoutMs
server.headersTimeout = headersTimeoutMs
