import { IncomingMessage, ServerResponse } from 'http'
import { getSheetRows, appendRow, SHEETS } from '../lib/sheets'
import { requireAuth, requireAdmin, sendError, sendJson, parseBody } from '../lib/auth'
import type { Question } from '../../src/types'

function rowToQuestion(row: string[]): Question {
  const [id, examId, domain, question, type, options, answers, explanation, difficulty, createdAt] = row
  return {
    id, examId, domain, question,
    type: type as Question['type'],
    options: JSON.parse(options || '[]'),
    answers: JSON.parse(answers || '[]'),
    explanation: JSON.parse(explanation || '{}'),
    difficulty: difficulty as Question['difficulty'],
    createdAt,
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

  try {
    // GET: 問題一覧取得（認証済みユーザー）
    if (req.method === 'GET') {
      await requireAuth(req)
      const url = new URL(req.url!, `http://${req.headers.host}`)
      const examId = url.searchParams.get('examId')
      const domain = url.searchParams.get('domain')
      const difficulty = url.searchParams.get('difficulty')
      const count = parseInt(url.searchParams.get('count') || '0')
      const random = url.searchParams.get('random') === 'true'

      const rows = await getSheetRows(SHEETS.QUESTIONS)
      let questions = rows.map(rowToQuestion)

      if (examId) questions = questions.filter(q => q.examId === examId)
      if (domain && domain !== 'all') questions = questions.filter(q => q.domain === domain)
      if (difficulty && difficulty !== 'all') questions = questions.filter(q => q.difficulty === difficulty)

      if (random) {
        questions = questions.sort(() => Math.random() - 0.5)
      }
      if (count > 0) {
        questions = questions.slice(0, count)
      }

      return sendJson(res, questions)
    }

    // POST: 問題追加（管理者のみ）
    if (req.method === 'POST') {
      await requireAdmin(req)
      const body = await parseBody<{ questions: Omit<Question, 'id' | 'createdAt'>[] }>(req)

      const saved: Question[] = []
      for (const q of body.questions) {
        const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const createdAt = new Date().toISOString()
        await appendRow(SHEETS.QUESTIONS, [
          id,
          q.examId,
          q.domain,
          q.question,
          q.type,
          JSON.stringify(q.options),
          JSON.stringify(q.answers),
          JSON.stringify(q.explanation),
          q.difficulty,
          createdAt,
        ])
        saved.push({ ...q, id, createdAt })
      }

      return sendJson(res, { saved, count: saved.length }, 201)
    }

    sendError(res, 405, 'Method Not Allowed')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました'
    const status = message.includes('認証') || message.includes('権限') ? 401 : 500
    sendError(res, status, message)
  }
}
