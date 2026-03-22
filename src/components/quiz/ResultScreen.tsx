import { Link } from 'react-router-dom'
import type { Question } from '../../types'

interface Answer {
  questionId: string
  userAnswer: string[]
  isCorrect: boolean
}

interface Props {
  questions: Question[]
  answers: Answer[]
  score: number
  onRetry: () => void
}

export default function ResultScreen({ questions, answers, score, onRetry }: Props) {
  const total = questions.length
  const accuracy = Math.round((score / total) * 100)
  const passed = accuracy >= 70

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* スコアカード */}
      <div className={`card text-center ${passed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <p className="text-5xl mb-2">{passed ? '🎉' : '📚'}</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          {score} / {total} 問正解
        </h2>
        <p className={`text-4xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
          {accuracy}%
        </p>
        <p className={`text-sm font-medium ${passed ? 'text-green-700' : 'text-red-700'}`}>
          {passed ? '合格ライン（70%）を超えました！' : '合格ラインまで あと少し！'}
        </p>
      </div>

      {/* 問題ごとの結果 */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">問題別結果</h3>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const answer = answers.find(a => a.questionId === q.id)
            const isCorrect = answer?.isCorrect ?? false
            return (
              <div key={q.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-2">{q.question}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{q.domain}</p>
                  {!isCorrect && answer && (
                    <p className="text-xs text-red-600 mt-0.5">
                      あなたの回答: {answer.userAnswer.join(', ')} / 正解: {q.answers.join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-lg flex-shrink-0">{isCorrect ? '✓' : '✗'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* アクション */}
      <div className="flex gap-3">
        <button onClick={onRetry} className="btn-primary flex-1">
          もう一度解く
        </button>
        <Link to="/" className="btn-secondary flex-1 text-center">
          ダッシュボードへ
        </Link>
      </div>
    </div>
  )
}
