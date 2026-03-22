import { useState } from 'react'
import { api } from '../../utils/api'
import type { Question } from '../../types'
import clsx from 'clsx'

interface Props {
  questions: Question[]
  onDeleted: (id: string) => void
}

const difficultyLabel = { easy: 'やさしい', medium: '普通', hard: 'むずかしい' }
const difficultyClass = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }
const typeLabel = { single: '単一選択', multiple: '複数選択' }

export default function QuestionList({ questions, onDeleted }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterDomain, setFilterDomain] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const domains = ['all', ...new Set(questions.map(q => q.domain))]

  const filtered = questions.filter(q => {
    if (filterDomain !== 'all' && q.domain !== filterDomain) return false
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
    if (filterType !== 'all' && q.type !== filterType) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm('この問題を削除しますか？')) return
    setDeletingId(id)
    try {
      await api.questions.delete(id)
      onDeleted(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-4xl mb-4">📭</p>
        <p className="text-gray-600">問題がまだ登録されていません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="card py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} className="input w-auto text-sm">
            {domains.map(d => <option key={d} value={d}>{d === 'all' ? 'すべてのドメイン' : d}</option>)}
          </select>
          <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className="input w-auto text-sm">
            <option value="all">すべての難易度</option>
            <option value="easy">やさしい</option>
            <option value="medium">普通</option>
            <option value="hard">むずかしい</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-auto text-sm">
            <option value="all">すべてのタイプ</option>
            <option value="single">単一選択</option>
            <option value="multiple">複数選択</option>
          </select>
          <span className="text-sm text-gray-500 ml-auto">{filtered.length}件</span>
        </div>
      </div>

      {/* 問題リスト */}
      <div className="space-y-2">
        {filtered.map(q => (
          <div key={q.id} className="card py-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={difficultyClass[q.difficulty]}>{difficultyLabel[q.difficulty]}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{typeLabel[q.type]}</span>
                  <span className="text-xs text-gray-500">{q.domain}</span>
                </div>
                <p
                  className={clsx('text-sm text-gray-800', expandedId !== q.id && 'line-clamp-2 cursor-pointer')}
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                >
                  {q.question}
                </p>

                {expandedId === q.id && (
                  <div className="mt-3 space-y-2">
                    <div className="space-y-1">
                      {q.options.map(o => (
                        <div key={o.label} className={clsx(
                          'text-xs px-2 py-1 rounded flex gap-2',
                          q.answers.includes(o.label) ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-600'
                        )}>
                          <span className="font-bold">{o.label}.</span>
                          <span>{o.text}</span>
                          {q.answers.includes(o.label) && <span className="ml-auto">✓</span>}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                      <strong>解説：</strong>{q.explanation.correct}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded"
                >
                  {expandedId === q.id ? '閉じる' : '詳細'}
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  disabled={deletingId === q.id}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
