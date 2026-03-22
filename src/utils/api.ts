import type { Question, QuizSession, QuizSettings, UserStats, Exam, ExamGuide } from '../types'

const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'エラーが発生しました')
  return data as T
}

// 認証
export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; user: { id: string; username: string; role: string } }>(
        '/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }
      ),
  },

  exams: {
    list: () => request<Exam[]>('/exams'),
    create: (data: Omit<Exam, 'id' | 'createdAt'>) =>
      request<Exam>('/exams', { method: 'POST', body: JSON.stringify(data) }),
  },

  questions: {
    list: (params: { examId?: string; domain?: string; difficulty?: string; count?: number; random?: boolean }) => {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)))
      return request<Question[]>(`/questions?${qs}`)
    },
    save: (questions: Omit<Question, 'id' | 'createdAt'>[]) =>
      request<{ saved: Question[]; count: number }>(
        '/questions', { method: 'POST', body: JSON.stringify({ questions }) }
      ),
    update: (id: string, data: Partial<Question>) =>
      request<{ success: boolean }>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/questions/${id}`, { method: 'DELETE' }),
  },

  sessions: {
    list: () => request<QuizSession[]>('/sessions'),
    create: (settings: QuizSettings, questionIds: string[]) =>
      request<QuizSession>('/sessions', { method: 'POST', body: JSON.stringify({ settings, questionIds }) }),
    complete: (
      id: string,
      answers: { questionId: string; userAnswer: string[]; isCorrect: boolean }[],
      score: number,
      total: number
    ) =>
      request<{ success: boolean }>(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ answers, completedAt: new Date().toISOString(), score, total }),
      }),
    getAnswers: (id: string) => request<{ id: string; questionId: string; userAnswer: string[]; isCorrect: boolean }[]>(`/sessions/${id}/answers`),
  },

  examGuides: {
    list: (examId: string) => request<ExamGuide[]>(`/exam-guides?examId=${examId}`),
    save: (examId: string, domains: { domain: string; content: string }[]) =>
      request<{ saved: ExamGuide[]; count: number }>(
        '/exam-guides', { method: 'POST', body: JSON.stringify({ examId, domains }) }
      ),
  },

  stats: {
    get: () => request<UserStats>('/stats'),
  },
}
