import type { GeneratorSettings, ExamGuide, Exam } from '../types'

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'やさしい（基礎的な概念の理解）',
  medium: '普通（実際のユースケースへの適用）',
  hard: 'むずかしい（複数の要素を組み合わせた複雑な問題）',
}

const TYPE_INSTRUCTIONS: Record<string, string> = {
  single: '単一選択（選択肢4つ、正解1つ）',
  'multiple-2': '複数選択（選択肢5つ、正解2つ）',
  'multiple-3': '複数選択（選択肢6つ、正解3つ）',
  mixed: '単一選択と複数選択を混在（全体の半数ずつ）',
}

export function buildPrompt(
  settings: GeneratorSettings,
  exam: Exam,
  guide: ExamGuide | null
): string {
  const typeInstruction = TYPE_INSTRUCTIONS[settings.questionType] || TYPE_INSTRUCTIONS.single

  const guideSection = guide
    ? `
## 試験ガイド参照情報
以下は${exam.name} (${exam.code}) 公式試験ガイドより、「${guide.domain}」の抜粋です。
この内容に厳密に基づいて問題を作成してください。

--- 試験ガイド抜粋 開始 ---
${guide.content.substring(0, 8000)}
--- 試験ガイド抜粋 終了 ---
`
    : `
## 試験情報
試験: ${exam.name} (${exam.code})
対象ドメイン: ${settings.domain}
※試験ガイドが未登録のため、AWSの公式ドキュメントに基づいて作成してください。
`

  const subTopicSection = settings.subTopic
    ? `- サブトピック（重点テーマ）: ${settings.subTopic}`
    : ''

  const jsonFormat = buildJsonFormat(settings.questionType)

  return `あなたはAWS認定試験の問題作成の専門家です。
以下の品質基準を厳守してください：

【品質基準】
- 実際のAWS認定試験の形式・難易度に準拠すること
- 問題文は「状況・背景 → 課題・要件 → 何を問うか」の構造で書くこと
- 誤答選択肢（ディストラクター）は「それらしいが明確に間違っている」ものにすること
  例: 実在しないAWSサービス名は使わない。実在するが用途が違うサービスを使う
- 選択肢の正解位置は問題間でA〜D（またはA〜E/F）に均等に分散させること
- 全問日本語で作成すること
- AWSサービス名は英語表記を維持すること（例: Amazon Bedrock、AWS Lambda）
${guideSection}
## 生成条件
- 試験: ${exam.name} (${exam.code})
- ドメイン: ${settings.domain}
${subTopicSection}
- 問題タイプ: ${typeInstruction}
- 難易度: ${DIFFICULTY_LABELS[settings.difficulty] || settings.difficulty}
- 生成数: ${settings.count}問

## 出力形式
以下のJSON形式のみで回答してください。前置き・説明文・マークダウンコードブロックは不要です。

${jsonFormat}`
}

function buildJsonFormat(questionType: string): string {
  const isMixed = questionType === 'mixed'
  const isMultiple2 = questionType === 'multiple-2'
  const isMultiple3 = questionType === 'multiple-3'

  const optionCount = isMultiple3 ? 6 : isMultiple2 ? 5 : 4
  const answerCount = isMultiple3 ? 3 : isMultiple2 ? 2 : 1
  const typeValue = questionType === 'single' ? 'single' : 'multiple'

  const options = Array.from({ length: optionCount }, (_, i) => {
    const label = String.fromCharCode(65 + i) // A, B, C, D, E, F
    return `      {"label": "${label}", "text": "選択肢${label}の内容"}`
  }).join(',\n')

  const answers = isMixed
    ? '["A"]  // 複数選択の場合は ["A", "C"] のように複数指定'
    : `[${Array.from({ length: answerCount }, (_, i) => `"${String.fromCharCode(65 + i)}"`).join(', ')}]`

  const incorrectLabels = Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i))
    .filter(l => l !== 'A')
    .slice(0, 3)
  const incorrect = incorrectLabels
    .map(l => `        "${l}": "${l}が不正解である理由の説明"`)
    .join(',\n')

  return `[
  {
    "question": "問題文（状況・背景・課題を含む）",
    "type": "${isMixed ? 'single または multiple' : typeValue}",
    "options": [
${options}
    ],
    "answers": ${answers},
    "explanation": {
      "correct": "正解の理由を詳しく説明",
      "incorrect": {
${incorrect}
      }
    },
    "domain": "${'ドメイン名をそのまま記載'}",
    "difficulty": "${'easy | medium | hard'}"
  },
  // ... 残りの問題も同じ形式
]`
}
