import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/common/Layout'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { api } from '../utils/api'
import type { UserStats } from '../types'

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.stats.get()
      .then(setStats)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <Layout title="ダッシュボード">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner label="読み込み中..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* クイックアクション */}
          <div className="card bg-gradient-to-r from-aws-dark to-gray-700 text-white">
            <h2 className="text-lg font-semibold mb-2">今日も練習しよう！</h2>
            <p className="text-gray-300 text-sm mb-4">AWSの試験合格に向けて、毎日の積み重ねが大切です。</p>
            <Link to="/quiz" className="inline-block bg-aws-orange hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
              問題を解く
            </Link>
          </div>

          {/* 統計サマリー */}
          {stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="総セッション数" value={stats.totalSessions} unit="回" />
                <StatCard label="総解答数" value={stats.totalQuestions} unit="問" />
                <StatCard label="正解数" value={stats.totalCorrect} unit="問" />
                <StatCard
                  label="正答率"
                  value={stats.overallAccuracy}
                  unit="%"
                  color={stats.overallAccuracy >= 70 ? 'green' : stats.overallAccuracy >= 50 ? 'yellow' : 'red'}
                />
              </div>

              {/* ドメイン別正答率 */}
              {stats.domainStats.length > 0 && (
                <div className="card">
                  <h2 className="font-semibold text-gray-900 mb-4">ドメイン別正答率</h2>
                  <div className="space-y-3">
                    {stats.domainStats.map(d => (
                      <div key={d.domain}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 truncate mr-2">{d.domain}</span>
                          <span className="font-medium flex-shrink-0">
                            {d.accuracy}% ({d.correct}/{d.total})
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              d.accuracy >= 70 ? 'bg-green-500' : d.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${d.accuracy}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">※ 正答率の低い順に表示（重点的に学習しましょう）</p>
                </div>
              )}

              {/* 最近のセッション */}
              {stats.recentSessions.length > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">最近の解答履歴</h2>
                    <Link to="/history" className="text-sm text-aws-blue hover:underline">
                      すべて見る
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {stats.recentSessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {s.settings.domain === 'all' ? '全ドメイン' : s.settings.domain}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(s.startedAt).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        {s.score !== undefined && s.total !== undefined && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {s.score}/{s.total}問正解
                            </p>
                            <p className={`text-xs font-medium ${
                              (s.score / s.total) >= 0.7 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {Math.round((s.score / s.total) * 100)}%
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.totalSessions === 0 && (
                <div className="card text-center py-12">
                  <p className="text-4xl mb-4">📝</p>
                  <p className="text-gray-600 mb-4">まだ問題を解いていません</p>
                  <Link to="/quiz" className="btn-primary inline-block">
                    最初の問題を解く
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Layout>
  )
}

function StatCard({ label, value, unit, color }: {
  label: string; value: number; unit: string; color?: 'green' | 'yellow' | 'red'
}) {
  const colors = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  }
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ? colors[color] : 'text-gray-900'}`}>
        {value}<span className="text-sm font-normal ml-0.5">{unit}</span>
      </p>
    </div>
  )
}
