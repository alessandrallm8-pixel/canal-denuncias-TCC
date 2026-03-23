type HttpHandler = (req: unknown, res: unknown) => unknown

let cachedHandler: HttpHandler | null = null

async function resolveHandler(): Promise<HttpHandler> {
  if (cachedHandler) {
    return cachedHandler
  }

  const { createApp } = await import('../backend/src/app.js')
  cachedHandler = createApp() as unknown as HttpHandler

  return cachedHandler
}

export default async function handler(req: unknown, res: unknown) {
  const app = await resolveHandler()
  return app(req, res)
}
