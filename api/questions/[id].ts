import { IncomingMessage, ServerResponse } from 'http'
import { getSheetRows, updateRow, deleteRow, SHEETS } from '../lib/sheets'
import { requireAdmin, sendError, sendJson, parseBody } from '../lib/auth'
import type { Question } from '../../src/types'

function getIdFromUrl(url: string): string {
  const parts = url.split('?')[0].split('/')
  return parts[parts.length - 1]
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

  try {
    await requireAdmin(req)
    const id = getIdFromUrl(req.url!)
    const rows = await getSheetRows(SHEETS.QUESTIONS)
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) return sendError(res, 404, '問題が見つかりません')
    const sheetRowIndex = rowIndex + 2  // ヘッダー行 + 0始まりを1始まりに

    // PUT: 問題更新
    if (req.method === 'PUT') {
      const q = await parseBody<Partial<Question>>(req)
      const current = rows[rowIndex]
      const updated = [
        current[0],
        q.examId ?? current[1],
        q.domain ?? current[2],
        q.question ?? current[3],
        q.type ?? current[4],
        q.options ? JSON.stringify(q.options) : current[5],
        q.answers ? JSON.stringify(q.answers) : current[6],
        q.explanation ? JSON.stringify(q.explanation) : current[7],
        q.difficulty ?? current[8],
        current[9],
      ]
      await updateRow(SHEETS.QUESTIONS, sheetRowIndex, updated)
      return sendJson(res, { success: true })
    }

    // DELETE: 問題削除
    if (req.method === 'DELETE') {
      await deleteRow(SHEETS.QUESTIONS, sheetRowIndex)
      return sendJson(res, { success: true })
    }

    sendError(res, 405, 'Method Not Allowed')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました'
    const status = message.includes('認証') || message.includes('権限') ? 401 : 500
    sendError(res, status, message)
  }
}
