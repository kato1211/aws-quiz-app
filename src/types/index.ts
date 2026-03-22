// ユーザー
export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  username: string
  role: UserRole
}

// 試験
export interface Exam {
  id: string
  code: string        // 例: AIP-C01
  name: string        // 例: AWS Certified AI Practitioner
  description: string
  createdAt: string
}

// 試験ガイド（PDFから抽出したドメイン情報）
export interface ExamGuide {
  id: string
  examId: string
  domain: string      // 例: ドメイン1: AIとMLの基礎
  content: string     // PDFから抽出したテキスト
  createdAt: string
}

// 問題
export type QuestionType = 'single' | 'multiple'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface QuestionOption {
  label: string   // A, B, C, D, E, F
  text: string
}

export interface QuestionExplanation {
  correct: string
  incorrect: Record<string, string>
}

export interface Question {
  id: string
  examId: string
  domain: string
  question: string
  type: QuestionType
  options: QuestionOption[]
  answers: string[]           // 正解ラベルの配列 例: ['A'] or ['A', 'C']
  explanation: QuestionExplanation
  difficulty: Difficulty
  createdAt: string
}

// クイズセッション
export interface QuizSettings {
  examId: string
  domain: string | 'all'
  questionCount: number
  difficulty: Difficulty | 'all'
}

export interface QuizSession {
  id: string
  userId: string
  examId: string
  settings: QuizSettings
  questionIds: string[]
  startedAt: string
  completedAt?: string
  score?: number
  total?: number
}

// 解答
export interface SessionAnswer {
  id: string
  sessionId: string
  questionId: string
  userAnswer: string[]
  isCorrect: boolean
  answeredAt: string
}

// 統計
export interface DomainStats {
  domain: string
  total: number
  correct: number
  accuracy: number
}

export interface UserStats {
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  overallAccuracy: number
  domainStats: DomainStats[]
  recentSessions: QuizSession[]
}

// 問題生成設定
export interface GeneratorSettings {
  examId: string
  domain: string
  subTopic: string
  questionType: QuestionType | 'mixed'
  difficulty: Difficulty
  count: number
}
