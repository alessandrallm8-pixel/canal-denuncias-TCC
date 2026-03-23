import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../errors/http-error.js'

export type AdminRole = 'admin' | 'analista'

export type AdminPrincipal = {
  tokenId: string
  role: AdminRole
  adminId: string | null
}

type TokenRecord = {
  tokenId: string
  role: AdminRole
  adminId: string | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseAdminTokenMap(rawValue: string | undefined): Map<string, TokenRecord> {
  const records = new Map<string, TokenRecord>()

  if (!rawValue || rawValue.trim().length === 0) {
    return records
  }

  const entries = rawValue
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)

  for (const entry of entries) {
    const [token, roleRaw, adminIdRaw] = entry.split(':')

    if (!token || (roleRaw !== 'admin' && roleRaw !== 'analista')) {
      continue
    }

    const adminId = typeof adminIdRaw === 'string' && UUID_REGEX.test(adminIdRaw) ? adminIdRaw : null

    records.set(token, {
      tokenId: token.slice(0, 6),
      role: roleRaw,
      adminId
    })
  }

  return records
}

function readBearerToken(headerValue: string | undefined): string {
  if (!headerValue) {
    throw new HttpError(401, 'Autenticação administrativa inválida')
  }

  const [scheme, token] = headerValue.trim().split(/\s+/)

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new HttpError(401, 'Autenticação administrativa inválida')
  }

  return token
}

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readBearerToken(req.get('authorization'))
    const tokensMap = parseAdminTokenMap(process.env.ADMIN_API_TOKENS)

    if (tokensMap.size === 0) {
      throw new HttpError(500, 'Autenticação administrativa não configurada')
    }

    const principal = tokensMap.get(token)

    if (!principal) {
      throw new HttpError(401, 'Autenticação administrativa inválida')
    }

    req.adminPrincipal = principal

    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireAdminRole(allowed: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const principal = req.adminPrincipal

    if (!principal || !allowed.includes(principal.role)) {
      return next(new HttpError(403, 'Perfil sem permissão para esta operação'))
    }

    return next()
  }
}
