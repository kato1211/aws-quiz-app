import { IncomingMessage, ServerResponse } from 'http'
import { initializeSpreadsheet } from '../lib/sheets'
import { sendError, sendJson } from '../lib/auth'

// スプレッドシートの初期セットアップ用エンドポイント
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') return sendError(res, 405, 'Method Not Allowed')

  // 簡易的なセキュリティ: セットアップキーの確認
  const setupKey = req.headers['x-setup-key']
  if (setupKey !== process.env.JWT_SECRET) {
    return sendError(res, 401, 'Unauthorized')
  }

  try {
    await initializeSpreadsheet()
    sendJson(res, { success: true, message: 'スプレッドシートを初期化しました' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'エラーが発生しました'
    sendError(res, 500, message)
  }
}
