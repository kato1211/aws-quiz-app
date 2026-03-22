import { IncomingMessage, ServerResponse } from 'http'
import { getSheetRows, appendRow, deleteRow, SHEETS } from '../lib/sheets'
import { requireAdmin, requireAuth, sendError, sendJson, parseBody } from '../lib/auth'
import type { ExamGuide } from '../../src/types'

function rowToGuide(row: string[]): ExamGuide {
  const [id, examId, domain, content, createdAt] = row
  return { id, examId, domain, content, createdAt }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

  try {
    const url = new URL(req.url!, `http://${req.headers.host}`)

    // GET: 試験ガイド取得（認証済みユーザー）
    if (req.method === 'GET') {
      await requireAuth(req)
      const examId = url.searchParams.get('examId')
      const domain = url.searchParams.get('domain')

      const rows = await getSheetRows(SHEETS.EXAM_GUIDES)
      let guides = rows.map(rowToGuide)

      if (examId) guides = guides.filter(g => g.examId === examId)
      if (domain) guides = guides.filter(g => g.domain === domain)

      return sendJson(res, guides)
    }

    // POST: 試験ガイド保存（管理者のみ）
    if (req.method === 'POST') {
      await requireAdmin(req)
      const body = await parseBody<{ examId: string; domains: { domain: string; content: string }[] }>(req)

      // 既存の同試験ガイドを削除
      const rows = await getSheetRows(SHEETS.EXAM_GUIDES)
      const toDelete = rows
        .map((r, i) => ({ row: r, index: i }))
        .filter(({ row }) => row[1] === body.examId)
        .reverse()

      for (const { index } of toDelete) {
        await deleteRow(SHEETS.EXAM_GUIDES, index + 2)
      }

      // 新規保存
      const saved: ExamGuide[] = []
      for (const d of body.domains) {
        const id = `eg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
        const createdAt = new Date().toISOString()
        await appendRow(SHEETS.EXAM_GUIDES, [id, body.examId, d.domain, d.content, createdAt])
        saved.push({ id, examId: body.examId, domain: d.domain, content: d.content, createdAt })
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
