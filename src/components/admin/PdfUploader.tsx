import { useState, useRef } from 'react'
import { parsePdf, ParsedDomain } from '../../utils/pdfParser'
import { api } from '../../utils/api'
import LoadingSpinner from '../common/LoadingSpinner'

// AIP-C01のデフォルトドメイン構成
const AIP_C01_DOMAINS = [
  'ドメイン1: AIとMLの基礎 (20%)',
  'ドメイン2: 生成AIの基礎 (24%)',
  'ドメイン3: 基盤モデルのアプリケーション (28%)',
  'ドメイン4: 責任あるAIのガイドライン (14%)',
  'ドメイン5: AIソリューションのセキュリティ・コンプライアンス・ガバナンス (14%)',
]

interface Adjustment {
  start: string
  end: string
}

interface Props {
  examId: string
  examName: string
  onComplete: () => void
}

export default function PdfUploader({ examId, examName, onComplete }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedDomain[] | null>(null)
  const [origContents, setOrigContents] = useState<string[]>([])
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [rawText, setRawText] = useState('')

  const initAdjustments = (domains: ParsedDomain[]) => {
    setOrigContents(domains.map(d => d.content))
    setAdjustments(domains.map(() => ({ start: '', end: '' })))
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください')
      return
    }
    setError('')
    setIsLoading(true)
    setParsed(null)
    setSaveSuccess(false)
    setFileName(file.name)
    try {
      const domains = await parsePdf(file)
      if (domains.length === 1 && domains[0].domain.includes('全体')) {
        setRawText(domains[0].content)
        const isAipC01 = examId.includes('aip_c01')
        const defaultDomains = isAipC01
          ? AIP_C01_DOMAINS.map(d => ({ domain: d, content: '' }))
          : [{ domain: 'ドメイン1', content: '' }]
        setParsed(defaultDomains)
        initAdjustments(defaultDomains)
      } else {
        setRawText('')
        setParsed(domains)
        initAdjustments(domains)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF解析に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!parsed) return
    const validDomains = parsed.filter(d => d.domain.trim() && d.content.trim())
    if (validDomains.length === 0) {
      setError('少なくとも1つのドメインに名前と内容を入力してください')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await api.examGuides.save(examId, validDomains)
      setSaveSuccess(true)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const updateDomain = (index: number, field: 'domain' | 'content', value: string) => {
    if (!parsed) return
    const updated = [...parsed]
    updated[index] = { ...updated[index], [field]: value }
    setParsed(updated)
  }

  const updateAdjustment = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...adjustments]
    updated[index] = { ...updated[index], [field]: value }
    setAdjustments(updated)
  }

  const applyAdjustment = (index: number) => {
    const orig = origContents[index]
    if (!orig) return
    const { start, end } = adjustments[index] || {}
    let content = orig
    if (start) {
      const pos = content.indexOf(start)
      if (pos >= 0) content = content.slice(pos)
    }
    if (end) {
      const pos = content.indexOf(end)
      if (pos >= 0) content = content.slice(0, pos + end.length)
    }
    updateDomain(index, 'content', content)
  }

  const addDomain = () => {
    setParsed(prev => [...(prev || []), { domain: `ドメイン${(prev?.length || 0) + 1}`, content: '' }])
    setOrigContents(prev => [...prev, ''])
    setAdjustments(prev => [...prev, { start: '', end: '' }])
  }

  const removeDomain = (index: number) => {
    setParsed(prev => prev?.filter((_, i) => i !== index) || [])
    setOrigContents(prev => prev.filter((_, i) => i !== index))
    setAdjustments(prev => prev.filter((_, i) => i !== index))
  }

  const isManualMode = rawText.length > 0

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-3">
          <strong>{examName}</strong> の試験ガイドPDFをアップロードしてください。
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-secondary w-full py-8 border-2 border-dashed text-center"
          disabled={isLoading}
        >
          <div className="text-3xl mb-2">📄</div>
          <div className="text-sm text-gray-600">
            {fileName || 'PDFファイルを選択'}
          </div>
        </button>
        <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <LoadingSpinner label="PDFを解析中..." />
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ 試験ガイドを保存しました（{parsed?.filter(d => d.content).length}ドメイン）
        </div>
      )}

      {parsed && !saveSuccess && (
        <div className="space-y-4">
          {isManualMode && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p className="text-sm font-medium text-amber-800">
                ⚠ PDFのドメイン自動検出ができませんでした。手動で各ドメインの内容を入力してください。
              </p>
              <p className="text-xs text-amber-700">
                下の「PDFの全文テキスト」からドメインに関連する部分をコピーして各欄に貼り付けてください。
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {isManualMode ? '手動入力モード' : `自動検出: ${parsed.length}ドメイン`}
            </p>
            <button onClick={addDomain} className="text-xs btn-secondary py-1 px-3">
              + ドメインを追加
            </button>
          </div>

          {parsed.map((domain, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={domain.domain}
                  onChange={e => updateDomain(i, 'domain', e.target.value)}
                  className="input text-sm font-medium flex-1"
                  placeholder="ドメイン名（例: ドメイン1: AIとMLの基礎）"
                />
                {parsed.length > 1 && (
                  <button
                    onClick={() => removeDomain(i)}
                    className="text-red-500 hover:text-red-700 px-2 text-sm flex-shrink-0"
                  >
                    削除
                  </button>
                )}
              </div>
              <textarea
                value={domain.content}
                onChange={e => updateDomain(i, 'content', e.target.value)}
                className="input text-xs h-36 resize-y"
                placeholder="このドメインに関する試験ガイドの内容をここに貼り付けてください"
              />
              <p className="text-xs text-gray-400">{domain.content.length}文字</p>

              {/* 内容範囲の手動調整 */}
              {origContents[i] && (
                <details className="border border-gray-100 rounded p-2 bg-gray-50">
                  <summary className="text-xs text-gray-500 cursor-pointer select-none">
                    内容の範囲を調整（開始・終了テキストを指定）
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">開始テキスト（この文字列から始まるようにトリム）</label>
                      <input
                        type="text"
                        value={adjustments[i]?.start || ''}
                        onChange={e => updateAdjustment(i, 'start', e.target.value)}
                        className="input text-xs"
                        placeholder="例: タスク 1.1:"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">終了テキスト（この文字列で終わるようにトリム）</label>
                      <input
                        type="text"
                        value={adjustments[i]?.end || ''}
                        onChange={e => updateAdjustment(i, 'end', e.target.value)}
                        className="input text-xs"
                        placeholder="例: 設定する。"
                      />
                    </div>
                    <button
                      onClick={() => applyAdjustment(i)}
                      className="text-xs btn-secondary py-1 px-3"
                    >
                      適用
                    </button>
                  </div>
                </details>
              )}
            </div>
          ))}

          <button onClick={handleSave} disabled={isLoading} className="btn-primary w-full">
            {isLoading ? <LoadingSpinner size="sm" /> : null}
            スプレッドシートに保存
          </button>

          {isManualMode && (
            <details className="border border-gray-200 rounded-lg">
              <summary className="p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
                PDFの全文テキスト（コピー用） — {rawText.length}文字
              </summary>
              <div className="p-3 pt-0">
                <textarea
                  readOnly
                  value={rawText}
                  className="input text-xs h-64 resize-y bg-gray-50 font-mono"
                />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
