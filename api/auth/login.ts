import { IncomingMessage, ServerResponse } from 'http'
import bcrypt from 'bcryptjs'
import { getSheetRows, appendRow, SHEETS } from '../lib/sheets'
import { signToken, sendError, sendJson, parseBody } from '../lib/auth'

interface LoginBody {
  username: string
  password: string
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

  if (req.method !== 'POST') return sendError(res, 405, 'Method Not Allowed')

  try {
    const { username, password } = await parseBody<LoginBody>(req)
    if (!username || !password) return sendError(res, 400, 'ユーザー名とパスワードを入力してください')

    const rows = await getSheetRows(SHEETS.USERS)
    // columns: id, username, password_hash, role, created_at
    const userRow = rows.find(r => r[1] === username)

    if (!userRow) {
      // 初回起動時: 環境変数の初期アカウントでログイン可能
      const adminUser = process.env.ADMIN_USERNAME
      const adminPass = process.env.ADMIN_PASSWORD
      const normalUser = process.env.USER_USERNAME
      const normalPass = process.env.USER_PASSWORD

      if (username === adminUser && password === adminPass) {
        // 管理者アカウントをスプレッドシートに登録
        const hash = await bcrypt.hash(password, 10)
        const id = `u_${Date.now()}`
        await appendRow(SHEETS.USERS, [id, username, hash, 'admin', new Date().toISOString()])

        // AIP-C01試験データを登録
        await seedInitialData()

        const token = await signToken({ userId: id, username, role: 'admin' })
        return sendJson(res, { token, user: { id, username, role: 'admin' } })
      }

      if (username === normalUser && password === normalPass) {
        const hash = await bcrypt.hash(password, 10)
        const id = `u_${Date.now()}`
        await appendRow(SHEETS.USERS, [id, username, hash, 'user', new Date().toISOString()])
        const token = await signToken({ userId: id, username, role: 'user' })
        return sendJson(res, { token, user: { id, username, role: 'user' } })
      }

      return sendError(res, 401, 'ユーザー名またはパスワードが正しくありません')
    }

    const [id, , passwordHash, role] = userRow
    const isValid = await bcrypt.compare(password, passwordHash)
    if (!isValid) return sendError(res, 401, 'ユーザー名またはパスワードが正しくありません')

    const token = await signToken({ userId: id, username, role: role as 'admin' | 'user' })
    sendJson(res, { token, user: { id, username, role } })
  } catch (err) {
    console.error(err)
    sendError(res, 500, 'サーバーエラーが発生しました')
  }
}

// 初回ログイン時にAIP-C01の試験データを投入
async function seedInitialData() {
  const exams = await getSheetRows(SHEETS.EXAMS)
  if (exams.length > 0) return  // 既にデータあり

  const examId = 'exam_aip_c01'
  await appendRow(SHEETS.EXAMS, [
    examId,
    'AIP-C01',
    'AWS Certified Generative AI Developer - Professional',
    '生成AIと基盤モデルを活用したアプリケーション開発の専門知識を問う認定試験',
    new Date().toISOString(),
  ])
}
