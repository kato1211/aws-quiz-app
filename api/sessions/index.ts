import { IncomingMessage, ServerResponse } from 'http'
import { getSheetRows, appendRow, SHEETS } from '../lib/sheets'
import { requireAuth, sendError, sendJson, parseBody } from '../lib/auth'
import type { QuizSession, QuizSettings } from '../../src/types'

function rowToSession(row: string[]): QuizSession {
  const [id, userId, examId, settings, questionIds, startedAt, completedAt, score, total] = row
  return {
    id, userId, examId,
    settings: JSON.parse(settings || '{}'),
    questionIds: JSON.parse(questionIds || '[]'),
    startedAt,
    completedAt: completedAt || undefined,
    score: score ? parseInt(score) : undefined,
    total: total ? parseInt(total) : undefined,
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

  try {
    const authPayload = await requireAuth(req)

    // GET: セッション一覧（自分のもの）
    if (req.method === 'GET') {
      const rows = await getSheetRows(SHEETS.SESSIONS)
      const sessions = rows
        .map(rowToSession)
        .filter(s => s.userId === authPayload.userId)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      return sendJson(res, sessions)
    }

    // POST: 新しいセッション開始
    if (req.method === 'POST') {
      const body = await parseBody<{ settings: QuizSettings; questionIds: string[] }>(req)
      const id = `s_${Date.now()}`
      const startedAt = new Date().toISOString()

      await appendRow(SHEETS.SESSIONS, [
        id,
        authPayload.userId,
        body.settings.examId,
        JSON.stringify(body.settings),
        JSON.stringify(body.questionIds),
        startedAt,
        '', '', '',
      ])

      const session: QuizSession = {
        id,
        userId: authPayload.userId,
        examId: body.settings.examId,
        settings: body.settings,
        questionIds: body.questionIds,
        startedAt,
      }
      return sendJson(res, session, 201)
    }

    sendError(res, 405, 'Method Not Allowed')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました'
    const status = message.includes('認証') ? 401 : 500
    sendError(res, status, message)
  }
}
