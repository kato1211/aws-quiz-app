import { useState, useEffect } from 'react'
import Layout from '../components/common/Layout'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { api } from '../utils/api'
import type { QuizSession } from '../types'

const difficultyLabel = { all: 'すべて', easy: 'やさしい', medium: '普通', hard: 'むずかしい' }

export default function HistoryPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.sessions.list()
      .then(data => setSessions(data.filter(s => s.completedAt)))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <Layout title="解答履歴">
        <div className="flex justify-center py-12">
          <LoadingSpinner label="読み込み中..." />
        </div>
      </Layout>
    )
  }

  if (sessions.length === 0) {
    return (
      <Layout title="解答履歴">
        <div className="card text-center py-12">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-gray-600">まだ解答履歴がありません</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="解答履歴">
      <div className="space-y-3">
        {sessions.map(s => {
          const accuracy = s.score !== undefined && s.total
            ? Math.round((s.score / s.total) * 100)
            : null

          return (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {s.settings.domain === 'all' ? '全ドメイン' : s.settings.domain}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {difficultyLabel[s.settings.difficulty] || s.settings.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(s.startedAt).toLocaleDateString('ja-JP', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {accuracy !== null && s.score !== undefined && s.total && (
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{s.score}/{s.total}問</p>
                    <p className={`text-sm font-semibold ${accuracy >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                      {accuracy}%
                    </p>
                  </div>
                )}
              </div>

              {accuracy !== null && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${accuracy >= 70 ? 'bg-green-500' : accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
