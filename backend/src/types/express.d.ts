export {}

import type { AdminPrincipal } from '../middlewares/admin-auth.middleware.js'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      adminPrincipal?: AdminPrincipal
    }
  }
}
