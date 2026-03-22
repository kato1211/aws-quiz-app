import { google } from 'googleapis'

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })
  return oauth2Client
}

export function getSheetsClient() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!

// シート名定数
export const SHEETS = {
  USERS: 'users',
  EXAMS: 'exams',
  EXAM_GUIDES: 'exam_guides',
  QUESTIONS: 'questions',
  SESSIONS: 'sessions',
  SESSION_ANSWERS: 'session_answers',
} as const

// 指定シートの全データを取得（ヘッダー行を除く）
export async function getSheetRows(sheetName: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:Z`,
  })
  return (res.data.values as string[][]) || []
}

// 指定シートにデータを追加
export async function appendRow(sheetName: string, values: (string | number | boolean)[]) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: [values.map(String)] },
  })
}

// 指定シートの特定行を更新（行番号は1始まり、ヘッダー含む）
export async function updateRow(sheetName: string, rowIndex: number, values: (string | number | boolean)[]) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values.map(String)] },
  })
}

// 指定シートの特定行を削除（行番号は1始まり）
export async function deleteRow(sheetName: string, rowIndex: number) {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName)
  if (!sheet?.properties?.sheetId) throw new Error(`Sheet not found: ${sheetName}`)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,  // 0始まり
            endIndex: rowIndex,
          },
        },
      }],
    },
  })
}

// スプレッドシートを初期化（シートとヘッダー行を作成）
export async function initializeSpreadsheet() {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const existingSheets = meta.data.sheets?.map(s => s.properties?.title) || []

  const sheetConfigs = [
    { name: SHEETS.USERS, headers: ['id', 'username', 'password_hash', 'role', 'created_at'] },
    { name: SHEETS.EXAMS, headers: ['id', 'code', 'name', 'description', 'created_at'] },
    { name: SHEETS.EXAM_GUIDES, headers: ['id', 'exam_id', 'domain', 'content', 'created_at'] },
    { name: SHEETS.QUESTIONS, headers: ['id', 'exam_id', 'domain', 'question', 'type', 'options', 'answers', 'explanation', 'difficulty', 'created_at'] },
    { name: SHEETS.SESSIONS, headers: ['id', 'user_id', 'exam_id', 'settings', 'question_ids', 'started_at', 'completed_at', 'score', 'total'] },
    { name: SHEETS.SESSION_ANSWERS, headers: ['id', 'session_id', 'question_id', 'user_answer', 'is_correct', 'answered_at'] },
  ]

  const requests = sheetConfigs
    .filter(c => !existingSheets.includes(c.name))
    .map(c => ({ addSheet: { properties: { title: c.name } } }))

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    })
  }

  // ヘッダー行を設定
  for (const config of sheetConfigs) {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${config.name}!A1:Z1`,
    })
    if (!existing.data.values?.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${config.name}!A1:Z1`,
        valueInputOption: 'RAW',
        requestBody: { values: [config.headers] },
      })
    }
  }
}
