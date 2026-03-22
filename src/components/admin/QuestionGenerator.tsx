import { useState, useEffect } from 'react'
import { api } from '../../utils/api'
import { buildPrompt } from '../../utils/promptBuilder'
import LoadingSpinner from '../common/LoadingSpinner'
import type { Exam, ExamGuide, GeneratorSettings, Question } from '../../types'

interface Props {
  exams: Exam[]
  onSaved: () => void
}

const QUESTION_TYPE_OPTIONS = [
  { value: 'single', label: '単一選択（4択・1正解）' },
  { value: 'multiple-2', label: '複数選択（5択・2正解）' },
  { value: 'multiple-3', label: '複数選択（6択・3正解）' },
  { value: 'mixed', label: '混在（単一＋複数）' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'やさしい' },
  { value: 'medium', label: '普通' },
  { value: 'hard', label: 'むずかしい' },
]

export default function QuestionGenerator({ exams, onSaved }: Props) {
  const [settings, setSettings] = useState<GeneratorSettings>({
    examId: exams[0]?.id || '',
    domain: '',
    subTopic: '',
    questionType: 'single',
    difficulty: 'medium',
    count: 3,
  })

  const [guides, setGuides] = useState<ExamGuide[]>([])
  const [prompt, setPrompt] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ count: number } | null>(null)
  const [parseError, setParseError] = useState('')

  useEffect(() => {
    if (!settings.examId) return
    api.examGuides.list(settings.examId).then(g => {
      setGuides(g)
      if (g.length > 0 && !settings.domain) {
        setSettings(prev => ({ ...prev, domain: g[0].domain }))
      }
    }).catch(console.error)
  }, [settings.examId])

  const generatePrompt = () => {
    const exam = exams.find(e => e.id === settings.examId)
    if (!exam) return
    const guide = guides.find(g => g.domain === settings.domain) || null
    const built = buildPrompt(settings, exam, guide)
    setPrompt(built)
    setCopied(false)
    setSaveResult(null)
    setParseError('')
    setJsonInput('')
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const saveQuestions = async () => {
    setParseError('')
    setSaveResult(null)

    let parsed: unknown[]
    try {
      parsed = JSON.parse(jsonInput)
      if (!Array.isArray(parsed)) throw new Error('配列形式で貼り付けてください')
    } catch {
      setParseError('JSONの解析に失敗しました。Claude の回答をそのまま貼り付けてください。')
      return
    }

    setIsSaving(true)
    try {
      const exam = exams.find(e => e.id === settings.examId)!
      const questions = (parsed as Record<string, unknown>[]).map((q) => ({
        examId: settings.examId,
        domain: (q.domain as string) || settings.domain,
        question: q.question as string,
        type: ((q.type as string) === 'multiple' ? 'multiple' : 'single') as 'single' | 'multiple',
        options: q.options as Question['options'],
        answers: q.answers as string[],
        explanation: q.explanation as Question['explanation'],
        difficulty: (q.difficulty as Question['difficulty']) || settings.difficulty,
      }))

      const result = await api.questions.save(questions)
      setSaveResult({ count: result.count })
      setJsonInput('')
      onSaved()
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const currentExam = exams.find(e => e.id === settings.examId)

  return (
    <div className="space-y-6">
      {/* ステップ1: 設定 */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="bg-aws-orange text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
          生成条件を設定
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">試験</label>
            <select
              value={settings.examId}
              onChange={e => setSettings(prev => ({ ...prev, examId: e.target.value, domain: '' }))}
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
              value={settings.domain}
              onChange={e => setSettings(prev => ({ ...prev, domain: e.target.value }))}
              className="input"
            >
              <option value="">ドメインを選択</option>
              {guides.map(g => (
                <option key={g.id} value={g.domain}>{g.domain}</option>
              ))}
            </select>
            {guides.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ※ 試験ガイドが未登録です。PDFアップロードタブから登録してください。
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="label">サブトピック（任意）</label>
            <input
              type="text"
              value={settings.subTopic}
              onChange={e => setSettings(prev => ({ ...prev, subTopic: e.target.value }))}
              className="input"
              placeholder="例: RAGとFine-tuningの違い"
            />
          </div>

          <div>
            <label className="label">問題タイプ</label>
            <select
              value={settings.questionType}
              onChange={e => setSettings(prev => ({ ...prev, questionType: e.target.value as GeneratorSettings['questionType'] }))}
              className="input"
            >
              {QUESTION_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">難易度</label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setSettings(prev => ({ ...prev, difficulty: o.value as GeneratorSettings['difficulty'] }))}
                  className={`flex-1 py-2 px-2 rounded-lg text-sm border-2 transition-colors ${
                    settings.difficulty === o.value
                      ? 'border-aws-orange bg-orange-50 text-aws-orange font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">生成数: {settings.count}問</label>
            <input
              type="range" min={1} max={10} value={settings.count}
              onChange={e => setSettings(prev => ({ ...prev, count: Number(e.target.value) }))}
              className="w-full accent-aws-orange"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1問</span><span>10問</span>
            </div>
          </div>
        </div>

        <button
          onClick={generatePrompt}
          disabled={!settings.examId || !settings.domain}
          className="btn-primary mt-4"
        >
          プロンプトを生成
        </button>
      </div>

      {/* ステップ2: プロンプトコピー */}
      {prompt && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-aws-orange text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
            プロンプトをコピーして Claude に貼り付け
          </h3>
          <div className="relative">
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap">
              {prompt}
            </pre>
            <button
              onClick={copyToClipboard}
              className={`absolute top-2 right-2 px-3 py-1 rounded text-xs font-medium transition-colors ${
                copied ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              1. 上のプロンプトをコピー →
              2. <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="underline font-medium">claude.ai</a> に貼り付けて送信 →
              3. Claudeが返したJSONを下の欄に貼り付け
            </p>
          </div>
        </div>
      )}

      {/* ステップ3: JSON貼り付け・保存 */}
      {prompt && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-aws-orange text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
            Claudeの回答（JSON）を貼り付けて保存
          </h3>
          <textarea
            value={jsonInput}
            onChange={e => { setJsonInput(e.target.value); setParseError(''); setSaveResult(null) }}
            className="input h-48 font-mono text-xs resize-y"
            placeholder={'[\n  {\n    "question": "...",\n    ...\n  }\n]'}
          />
          {parseError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {parseError}
            </div>
          )}
          {saveResult && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✓ {saveResult.count}問をスプレッドシートに保存しました！
            </div>
          )}
          <button
            onClick={saveQuestions}
            disabled={!jsonInput.trim() || isSaving}
            className="btn-primary mt-3 flex items-center gap-2"
          >
            {isSaving && <LoadingSpinner size="sm" />}
            スプレッドシートに保存
          </button>
        </div>
      )}
    </div>
  )
}
