import { IncomingMessage, ServerResponse } from 'http'
import { getSheetRows, SHEETS } from '../lib/sheets'
import { requireAuth, sendError, sendJson } from '../lib/auth'
import type { UserStats, DomainStats } from '../../src/types'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (req.method !== 'GET') return sendError(res, 405, 'Method Not Allowed')

  try {
    const authPayload = await requireAuth(req)
    const userId = authPayload.userId

    const [sessionRows, answerRows, questionRows] = await Promise.all([
      getSheetRows(SHEETS.SESSIONS),
      getSheetRows(SHEETS.SESSION_ANSWERS),
      getSheetRows(SHEETS.QUESTIONS),
    ])

    // ユーザーのセッションを抽出
    const userSessions = sessionRows.filter(r => r[1] === userId)
    const completedSessions = userSessions.filter(r => r[6] && r[7] && r[8])

    // セッションIDセット
    const sessionIds = new Set(userSessions.map(r => r[0]))
    const userAnswers = answerRows.filter(r => sessionIds.has(r[1]))

    // 問題IDからドメインを引くマップ
    const questionDomainMap = new Map(questionRows.map(r => [r[0], r[2]]))

    // ドメイン別集計
    const domainMap = new Map<string, { total: number; correct: number }>()
    for (const a of userAnswers) {
      const domain = questionDomainMap.get(a[2]) || '不明'
      const isCorrect = a[4] === 'true'
      const existing = domainMap.get(domain) || { total: 0, correct: 0 }
      domainMap.set(domain, {
        total: existing.total + 1,
        correct: existing.correct + (isCorrect ? 1 : 0),
      })
    }

    const domainStats: DomainStats[] = Array.from(domainMap.entries()).map(([domain, { total, correct }]) => ({
      domain,
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    })).sort((a, b) => a.accuracy - b.accuracy)

    const totalCorrect = userAnswers.filter(a => a[4] === 'true').length
    const totalQuestions = userAnswers.length

    const recentSessions = userSessions
      .sort((a, b) => new Date(b[5]).getTime() - new Date(a[5]).getTime())
      .slice(0, 5)
      .map(r => ({
        id: r[0],
        userId: r[1],
        examId: r[2],
        settings: JSON.parse(r[3] || '{}'),
        questionIds: JSON.parse(r[4] || '[]'),
        startedAt: r[5],
        completedAt: r[6] || undefined,
        score: r[7] ? parseInt(r[7]) : undefined,
        total: r[8] ? parseInt(r[8]) : undefined,
      }))

    const stats: UserStats = {
      totalSessions: completedSessions.length,
      totalQuestions,
      totalCorrect,
      overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      domainStats,
      recentSessions,
    }

    sendJson(res, stats)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました'
    const status = message.includes('認証') ? 401 : 500
    sendError(res, status, message)
  }
}
