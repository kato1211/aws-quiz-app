import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/common/Layout'
import LoadingSpinner from '../components/common/LoadingSpinner'
import QuestionCard from '../components/quiz/QuestionCard'
import ResultScreen from '../components/quiz/ResultScreen'
import { api } from '../utils/api'
import type { Question, Exam, QuizSettings } from '../types'

type Phase = 'setup' | 'loading' | 'quiz' | 'result'

interface SessionAnswer {
  questionId: string
  userAnswer: string[]
  isCorrect: boolean
}

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'easy', label: 'やさしい' },
  { value: 'medium', label: '普通' },
  { value: 'hard', label: 'むずかしい' },
]

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [exams, setExams] = useState<Exam[]>([])
  const [domains, setDomains] = useState<string[]>([])

  // セットアップフォーム
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')
  const [questionCount, setQuestionCount] = useState(10)
  const [error, setError] = useState('')

  // クイズ状態
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    api.exams.list()
      .then(data => {
        setExams(data)
        if (data.length > 0) setSelectedExam(data[0].id)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedExam) return
    api.examGuides.list(selectedExam)
      .then(guides => {
        const uniqueDomains = [...new Set(guides.map(g => g.domain))]
        setDomains(uniqueDomains)
      })
      .catch(console.error)
  }, [selectedExam])

  const startQuiz = async () => {
    setError('')
    setPhase('loading')
    try {
      const settings: QuizSettings = {
        examId: selectedExam,
        domain: selectedDomain,
        questionCount,
        difficulty: selectedDifficulty,
      }
      const fetched = await api.questions.list({
        examId: selectedExam,
        domain: selectedDomain !== 'all' ? selectedDomain : undefined,
        difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
        count: questionCount,
        random: true,
      })

      if (fetched.length === 0) {
        setError('条件に合う問題が見つかりません。管理者に問題の追加を依頼してください。')
        setPhase('setup')
        return
      }

      const session = await api.sessions.create(settings, fetched.map(q => q.id))
      setSessionId(session.id)
      setQuestions(fetched)
      setCurrentIndex(0)
      setSelectedAnswers([])
      setShowResult(false)
      setSessionAnswers([])
      setPhase('quiz')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setPhase('setup')
    }
  }

  const toggleAnswer = useCallback((label: string) => {
    const q = questions[currentIndex]
    if (q.type === 'single') {
      setSelectedAnswers([label])
    } else {
      setSelectedAnswers(prev =>
        prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]
      )
    }
  }, [questions, currentIndex])

  const confirmAnswer = () => {
    const q = questions[currentIndex]
    const isCorrect =
      q.answers.length === selectedAnswers.length &&
      q.answers.every(a => selectedAnswers.includes(a))
    setSessionAnswers(prev => [...prev, { questionId: q.id, userAnswer: selectedAnswers, isCorrect }])
    setShowResult(true)
  }

  const nextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswers([])
      setShowResult(false)
    } else {
      // confirmAnswer で既に最後の問題の解答が sessionAnswers に追加されている
      const allAnswers = sessionAnswers
      const finalScore = allAnswers.filter(a => a.isCorrect).length
      if (sessionId) {
        await api.sessions.complete(sessionId, allAnswers, finalScore, questions.length).catch(console.error)
      }
      setPhase('result')
    }
  }

  const finalScore = sessionAnswers.filter(a => a.isCorrect).length

  if (phase === 'result') {
    return (
      <Layout title="結果">
        <ResultScreen
          questions={questions}
          answers={sessionAnswers}
          score={finalScore}
          onRetry={() => setPhase('setup')}
        />
      </Layout>
    )
  }

  if (phase === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" label="問題を準備中..." />
        </div>
      </Layout>
    )
  }

  if (phase === 'quiz') {
    const q = questions[currentIndex]
    const canAnswer = q.type === 'single'
      ? selectedAnswers.length === 1
      : selectedAnswers.length === q.answers.length

    return (
      <Layout>
        {/* プログレスバー */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{currentIndex + 1} / {questions.length}</span>
            <span>{Math.round(((currentIndex) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-aws-orange h-2 rounded-full transition-all"
              style={{ width: `${(currentIndex / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <QuestionCard
          question={q}
          selectedAnswers={selectedAnswers}
          onToggleAnswer={toggleAnswer}
          showResult={showResult}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
        />

        <div className="mt-4 flex justify-end gap-3">
          {!showResult ? (
            <button
              onClick={confirmAnswer}
              disabled={!canAnswer}
              className="btn-primary px-8"
            >
              回答する
            </button>
          ) : (
            <button onClick={nextQuestion} className="btn-primary px-8">
              {currentIndex < questions.length - 1 ? '次の問題' : '結果を見る'}
            </button>
          )}
        </div>
      </Layout>
    )
  }

  // セットアップ画面
  return (
    <Layout title="問題を解く">
      <div className="max-w-lg">
        <div className="card space-y-5">
          <div>
            <label className="label">試験</label>
            <select
              value={selectedExam}
              onChange={e => setSelectedExam(e.target.value)}
              className="input"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">ドメイン</label>
            <select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="input"
            >
              <option value="all">すべてのドメイン</option>
              {domains.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">難易度</label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedDifficulty(opt.value as typeof selectedDifficulty)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                    selectedDifficulty === opt.value
                      ? 'border-aws-orange bg-orange-50 text-aws-orange'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">問題数: {questionCount}問</label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={questionCount}
              onChange={e => setQuestionCount(Number(e.target.value))}
              className="w-full accent-aws-orange"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5問</span>
              <span>50問</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button onClick={startQuiz} className="btn-primary w-full">
            スタート
          </button>
        </div>
      </div>
    </Layout>
  )
}
