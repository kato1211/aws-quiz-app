import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import PdfUploader from '../components/admin/PdfUploader'
import QuestionGenerator from '../components/admin/QuestionGenerator'
import QuestionList from '../components/admin/QuestionList'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'
import type { Exam, Question } from '../types'
import clsx from 'clsx'

type Tab = 'questions' | 'generate' | 'pdf' | 'exams'

const TAB_LABELS: Record<Tab, string> = {
  questions: '問題管理',
  generate: '問題生成',
  pdf: '試験ガイドPDF',
  exams: '試験管理',
}

export default function AdminPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('generate')
  const [exams, setExams] = useState<Exam[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 試験追加フォーム
  const [newExamCode, setNewExamCode] = useState('')
  const [newExamName, setNewExamName] = useState('')
  const [newExamDesc, setNewExamDesc] = useState('')
  const [isAddingExam, setIsAddingExam] = useState(false)

  useEffect(() => {
    api.exams.list()
      .then(data => {
        setExams(data)
        if (data.length > 0) setSelectedExamId(data[0].id)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedExamId) return
    api.questions.list({ examId: selectedExamId }).then(setQuestions).catch(console.error)
  }, [selectedExamId])

  const handleQuestionDeleted = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const handleQuestionsAdded = () => {
    if (selectedExamId) {
      api.questions.list({ examId: selectedExamId }).then(setQuestions).catch(console.error)
    }
  }

  const handleAddExam = async () => {
    if (!newExamCode || !newExamName) return
    setIsAddingExam(true)
    try {
      const added = await api.exams.create({ code: newExamCode, name: newExamName, description: newExamDesc })
      setExams(prev => [...prev, added])
      setNewExamCode('')
      setNewExamName('')
      setNewExamDesc('')
    } catch (err) {
      alert(err instanceof Error ? err.message : '追加に失敗しました')
    } finally {
      setIsAddingExam(false)
    }
  }

  const selectedExam = exams.find(e => e.id === selectedExamId)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-aws-dark text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-aws-orange font-bold text-xl">AWS</span>
            <span className="font-semibold">認定試験対策 - 管理者</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{user?.username}</span>
            <Link to="/" className="text-sm text-gray-300 hover:text-white">ユーザー画面</Link>
            <button onClick={logout} className="text-sm text-gray-300 hover:text-white">ログアウト</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
        {/* 試験セレクター */}
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-gray-700 flex-shrink-0">対象試験:</label>
          <select
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
            className="input w-auto"
          >
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">{questions.length}問登録済み</span>
        </div>

        {/* タブ */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-1">
            {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-aws-orange text-aws-orange'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </nav>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'generate' && (
          <QuestionGenerator exams={exams} onSaved={handleQuestionsAdded} />
        )}

        {activeTab === 'questions' && (
          <QuestionList questions={questions} onDeleted={handleQuestionDeleted} />
        )}

        {activeTab === 'pdf' && selectedExam && (
          <div className="max-w-2xl">
            <PdfUploader
              examId={selectedExam.id}
              examName={`${selectedExam.code} - ${selectedExam.name}`}
              onComplete={() => {}}
            />
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="max-w-2xl space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">新しい試験を追加</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">試験コード</label>
                  <input
                    type="text"
                    value={newExamCode}
                    onChange={e => setNewExamCode(e.target.value)}
                    className="input"
                    placeholder="例: SAA-C03"
                  />
                </div>
                <div>
                  <label className="label">試験名</label>
                  <input
                    type="text"
                    value={newExamName}
                    onChange={e => setNewExamName(e.target.value)}
                    className="input"
                    placeholder="例: AWS Certified Solutions Architect - Associate"
                  />
                </div>
                <div>
                  <label className="label">説明（任意）</label>
                  <input
                    type="text"
                    value={newExamDesc}
                    onChange={e => setNewExamDesc(e.target.value)}
                    className="input"
                    placeholder="試験の概要"
                  />
                </div>
                <button
                  onClick={handleAddExam}
                  disabled={!newExamCode || !newExamName || isAddingExam}
                  className="btn-primary"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">登録済み試験</h3>
              <div className="space-y-2">
                {exams.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{e.code}</p>
                      <p className="text-xs text-gray-500">{e.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
