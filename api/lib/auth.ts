import { SignJWT, jwtVerify } from 'jose'
import { IncomingMessage, ServerResponse } from 'http'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-me')
const EXPIRES_IN = '24h'

export interface JWTPayload {
  userId: string
  username: string
  role: 'admin' | 'user'
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as unknown as JWTPayload
}

// リクエストからJWTを検証してペイロードを返す
export async function requireAuth(req: IncomingMessage): Promise<JWTPayload> {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('認証トークンがありません')
  }
  const token = authHeader.slice(7)
  return verifyToken(token)
}

// 管理者権限を要求
export async function requireAdmin(req: IncomingMessage): Promise<JWTPayload> {
  const payload = await requireAuth(req)
  if (payload.role !== 'admin') {
    throw new Error('管理者権限が必要です')
  }
  return payload
}

// エラーレスポンス送信
export function sendError(res: ServerResponse, status: number, message: string) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: message }))
}

// 成功レスポンス送信
export function sendJson(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

// リクエストボディを解析
export async function parseBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch { reject(new Error('JSONの解析に失敗しました')) }
    })
    req.on('error', reject)
  })
}
