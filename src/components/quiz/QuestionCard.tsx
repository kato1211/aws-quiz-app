import clsx from 'clsx'
import type { Question } from '../../types'

interface Props {
  question: Question
  selectedAnswers: string[]
  onToggleAnswer: (label: string) => void
  showResult: boolean
  questionNumber: number
  totalQuestions: number
}

const difficultyLabels = { easy: 'やさしい', medium: '普通', hard: 'むずかしい' }
const difficultyClass = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }

export default function QuestionCard({
  question, selectedAnswers, onToggleAnswer, showResult, questionNumber, totalQuestions
}: Props) {
  const isMultiple = question.type === 'multiple'

  const getOptionStyle = (label: string) => {
    const isSelected = selectedAnswers.includes(label)
    const isCorrect = question.answers.includes(label)

    if (!showResult) {
      return clsx(
        'border-2 rounded-lg p-3 cursor-pointer transition-all flex items-start gap-3',
        isSelected
          ? 'border-aws-orange bg-orange-50'
          : 'border-gray-200 hover:border-gray-400 bg-white'
      )
    }

    // 結果表示時
    if (isCorrect) return 'border-2 border-green-500 bg-green-50 rounded-lg p-3 flex items-start gap-3'
    if (isSelected && !isCorrect) return 'border-2 border-red-500 bg-red-50 rounded-lg p-3 flex items-start gap-3'
    return 'border-2 border-gray-200 bg-white rounded-lg p-3 flex items-start gap-3 opacity-60'
  }

  const getOptionIcon = (label: string) => {
    if (!showResult) return null
    const isSelected = selectedAnswers.includes(label)
    const isCorrect = question.answers.includes(label)
    if (isCorrect) return <span className="text-green-600 flex-shrink-0 mt-0.5">✓</span>
    if (isSelected) return <span className="text-red-600 flex-shrink-0 mt-0.5">✗</span>
    return null
  }

  const isCorrectAnswer = !showResult
    ? false
    : question.answers.length === selectedAnswers.length &&
      question.answers.every(a => selectedAnswers.includes(a))

  return (
    <div className="card space-y-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-500">
            {questionNumber} / {totalQuestions}
          </span>
          <span className={difficultyClass[question.difficulty]}>
            {difficultyLabels[question.difficulty]}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {question.domain}
          </span>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {isMultiple ? `複数選択（${question.answers.length}つ選択）` : '単一選択'}
        </span>
      </div>

      {/* 問題文 */}
      <p className="text-gray-900 font-medium leading-relaxed whitespace-pre-wrap">
        {question.question}
      </p>

      {/* 選択肢 */}
      <div className="space-y-2">
        {question.options.map(option => (
          <button
            key={option.label}
            onClick={() => !showResult && onToggleAnswer(option.label)}
            disabled={showResult}
            className={clsx(getOptionStyle(option.label), 'w-full text-left')}
          >
            <span className="font-bold text-gray-600 flex-shrink-0 w-5">{option.label}.</span>
            <span className="text-gray-800 text-sm flex-1">{option.text}</span>
            {getOptionIcon(option.label)}
          </button>
        ))}
      </div>

      {/* 結果・解説 */}
      {showResult && (
        <div className={clsx(
          'rounded-lg p-4 space-y-3',
          isCorrectAnswer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        )}>
          <p className={clsx('font-semibold', isCorrectAnswer ? 'text-green-700' : 'text-red-700')}>
            {isCorrectAnswer ? '✓ 正解！' : '✗ 不正解'}
            {!isCorrectAnswer && (
              <span className="ml-2 font-normal text-sm">
                正解: {question.answers.join(', ')}
              </span>
            )}
          </p>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">正解の解説：</p>
            <p className="text-sm text-gray-600">{question.explanation.correct}</p>
          </div>
          {Object.keys(question.explanation.incorrect).length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">不正解の選択肢：</p>
              <div className="space-y-1">
                {Object.entries(question.explanation.incorrect).map(([label, reason]) => (
                  <p key={label} className="text-sm text-gray-600">
                    <span className="font-medium">{label}:</span> {reason}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
