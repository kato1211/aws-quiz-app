export interface ParsedDomain {
  domain: string
  content: string
}

export async function parsePdf(file: File): Promise<ParsedDomain[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : '') || '')
      .join(' ')
    fullText += pageText + '\n'
  }

  return splitIntoDomains(fullText)
}

function splitIntoDomains(text: string): ParsedDomain[] {
  // 「コンテンツ分野 X:」パターンを全て検索
  const markerPattern = /コンテンツ分野\s*(\d+)\s*[：:]/g
  const allMatches = [...text.matchAll(markerPattern)]

  // 実際のコンテンツセクション判定:
  // - タスク X.1 が150文字以内にある
  // - 「. . .」（TOC点線）を含まない（MLA-C01のTOCはタスクも列挙するため）
  // - 同じドメイン番号の初回出現のみ（ページヘッダー重複除去）
  const seen = new Set<string>()
  const contentMatches = allMatches.filter(match => {
    const domainNum = match[1]
    const near = text.slice(match.index!, match.index! + 150)
    const hasTaskNear = new RegExp(`タスク\\s*${domainNum}\\.\\d`).test(near)
    const hasTocDots = /\.\s*\.\s*\./.test(near)
    if (!hasTaskNear || hasTocDots) return false
    if (seen.has(domainNum)) return false
    seen.add(domainNum)
    return true
  })

  if (contentMatches.length >= 2) {
    return contentMatches.map((match, i) => {
      const sectionStart = match.index!
      const sectionEnd = contentMatches[i + 1]?.index ?? text.length
      const sectionText = text.slice(sectionStart, sectionEnd)

      // ドメイン名: 「コンテンツ分野 X:」から「タスク X.1」の手前まで
      const domainNum = match[1]
      const taskPattern = new RegExp(`タスク\\s*${domainNum}\\.1`)
      const taskPos = sectionText.search(taskPattern)
      const rawTitle = taskPos > 0 ? sectionText.slice(0, taskPos) : sectionText.slice(0, 150)

      // 「コンテンツ分野 X:」プレフィックスを除去（カタカナ・ひらがなの改行スペースも修正）
      // MLA-C01形式: 末尾の「タスク •」ゴミも除去
      const domainName = rawTitle
        .replace(/コンテンツ分野\s*\d+\s*[：:]\s*/, '')
        .replace(/\s*タスク[\s•・]*$/, '')
        .replace(/([ぁ-ん])\s([ぁ-ん])/g, '$1$2')
        .replace(/([ァ-ン])\s([ァ-ン])/g, '$1$2')
        .replace(/\s+/g, ' ')
        .trim()

      // コンテンツ: 「タスク X.1」から次のドメインまで（フッター除去済み）
      // 最後のドメインのみ付録・付属資料の手前で切り捨てる
      const appendixPattern = /試験に出題される可能性のあるテクノロジーと概念|付録|試験での AWS サービスへの言及|試験の範囲外|対象の AWS サービス|対象外の AWS サービス|Appendix/
      let rawSection = sectionText
      const isLastDomain = i === contentMatches.length - 1
      if (isLastDomain) {
        const appendixPos = sectionText.search(appendixPattern)
        if (appendixPos > 0) rawSection = sectionText.slice(0, appendixPos)
      }
      const contentRaw = taskPos > 0 ? rawSection.slice(taskPos) : rawSection
      const content = removeFooters(contentRaw, domainNum)

      return { domain: domainName, content }
    }).filter(d => d.domain && d.content.length > 30)
  }

  // 英語版 "Content Domain X:" フォールバック
  const engPattern = /Content\s+Domain\s*(\d+)\s*[：:]/gi
  const engMatches = [...text.matchAll(engPattern)].filter(match => {
    const domainNum = match[1]
    const following = text.slice(match.index!, match.index! + 500)
    return new RegExp(`Task\\s*${domainNum}\\.\\d`, 'i').test(following)
  })

  if (engMatches.length >= 2) {
    return engMatches.map((match, i) => {
      const start = match.index! + match[0].length
      const end = engMatches[i + 1]?.index ?? text.length
      return {
        domain: text.slice(start, start + 150).split(/Task\s*\d/i)[0].replace(/\s+/g, ' ').trim(),
        content: cleanContent(text.slice(start, end)),
      }
    }).filter(d => d.content.length > 30)
  }

  // 全て失敗: 全文をそのまま返す
  return [{ domain: '全体（手動でドメインごとに分割してください）', content: cleanContent(text) }]
}

function removeFooters(text: string, domainNum: string): string {
  return text
    // AWSの試験ガイドタイトル行（ページヘッダー/フッターとして繰り返される）
    .replace(/AWS Certified Generative AI Developer[^\n]{0,100}/g, '')
    .replace(/AWS Certified[^\n]{0,80}試験ガイド[^\n]{0,60}/g, '')
    .replace(/Professional\s+試験ガイド[^\n]{0,80}/g, '')
    // 「コンテンツ分野 X: タイトル   ページ番号」形式のページヘッダー（各ページ先頭に出現）
    .replace(new RegExp(`コンテンツ分野\\s*${domainNum}\\s*[：:][^タスクスキル]{0,100}\\s*\\d+\\s*\\n`, 'g'), '')
    // 行末の孤立したページ番号（数字のみ）
    .replace(/\s{2,}\d{1,3}\s*\n/g, '\n')
    // 「コンプライア ンス」のような不自然な空白を修正（ひらがな・カタカナ間の余分なスペース）
    .replace(/([ぁ-ん])\s([ぁ-ん])/g, '$1$2')
    .replace(/([ァ-ン])\s([ァ-ン])/g, '$1$2')
    // 連続空白を整理
    .replace(/[ \t]{3,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanContent(text: string): string {
  return text
    .replace(/[ \t]{3,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
