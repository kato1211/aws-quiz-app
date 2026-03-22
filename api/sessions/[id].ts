import { IncomingMessage, ServerResponse } from 'http'
import { getSheetRows, updateRow, appendRow, SHEETS } from '../lib/sheets'
import { requireAuth, sendError, sendJson, parseBody } from '../lib/auth'
import type { SessionAnswer } from '../../src/types'

function getIdFromUrl(url: string): string {
  const parts = url.split('?')[0].split('/')
  return parts[parts.length - 1]
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

  try {
    const authPayload = await requireAuth(req)
    const sessionId = getIdFromUrl(req.url!)
    const url = new URL(req.url!, `http://${req.headers.host}`)

    // GET /api/sessions/:id/answers - セッションの解答一覧取得
    if (req.method === 'GET' && url.pathname.endsWith('/answers')) {
      const rows = await getSheetRows(SHEETS.SESSION_ANSWERS)
      const answers = rows
        .filter(r => r[1] === sessionId)
        .map(r => ({
          id: r[0], sessionId: r[1], questionId: r[2],
          userAnswer: JSON.parse(r[3] || '[]'),
          isCorrect: r[4] === 'true',
          answeredAt: r[5],
        } as SessionAnswer))
      return sendJson(res, answers)
    }

    // PUT: セッション完了・スコア更新
    if (req.method === 'PUT') {
      const body = await parseBody<{
        answers?: { questionId: string; userAnswer: string[]; isCorrect: boolean }[]
        completedAt?: string
        score?: number
        total?: number
      }>(req)

      // 解答を保存
      if (body.answers) {
        for (const a of body.answers) {
          const id = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
          await appendRow(SHEETS.SESSION_ANSWERS, [
            id, sessionId, a.questionId,
            JSON.stringify(a.userAnswer),
            String(a.isCorrect),
            new Date().toISOString(),
          ])
        }
      }

      // セッション完了情報を更新
      if (body.completedAt !== undefined) {
        const rows = await getSheetRows(SHEETS.SESSIONS)
        const rowIndex = rows.findIndex(r => r[0] === sessionId)
        if (rowIndex === -1) return sendError(res, 404, 'セッションが見つかりません')

        const current = rows[rowIndex]
        if (current[1] !== authPayload.userId) return sendError(res, 403, 'アクセス権がありません')

        const updated = [...current]
        updated[6] = body.completedAt || new Date().toISOString()
        if (body.score !== undefined) updated[7] = String(body.score)
        if (body.total !== undefined) updated[8] = String(body.total)
        await updateRow(SHEETS.SESSIONS, rowIndex + 2, updated)
      }

      return sendJson(res, { success: true })
    }

    sendError(res, 405, 'Method Not Allowed')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました'
    const status = message.includes('認証') ? 401 : 500
    sendError(res, status, message)
  }
}
