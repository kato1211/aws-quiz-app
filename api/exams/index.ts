import { IncomingMessage, ServerResponse } from 'http'
import { getSheetRows, appendRow, SHEETS } from '../lib/sheets'
import { requireAuth, requireAdmin, sendError, sendJson, parseBody } from '../lib/auth'
import type { Exam } from '../../src/types'

function rowToExam(row: string[]): Exam {
  const [id, code, name, description, createdAt] = row
  return { id, code, name, description, createdAt }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

  try {
    if (req.method === 'GET') {
      await requireAuth(req)
      const rows = await getSheetRows(SHEETS.EXAMS)
      return sendJson(res, rows.map(rowToExam))
    }

    if (req.method === 'POST') {
      await requireAdmin(req)
      const body = await parseBody<Omit<Exam, 'id' | 'createdAt'>>(req)
      const id = `exam_${body.code.toLowerCase().replace(/-/g, '_')}`
      const createdAt = new Date().toISOString()
      await appendRow(SHEETS.EXAMS, [id, body.code, body.name, body.description, createdAt])
      return sendJson(res, { id, ...body, createdAt }, 201)
    }

    sendError(res, 405, 'Method Not Allowed')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました'
    const status = message.includes('認証') || message.includes('権限') ? 401 : 500
    sendError(res, status, message)
  }
}
