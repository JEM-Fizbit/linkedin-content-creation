import { NextRequest, NextResponse } from 'next/server'

// POST /api/sources/extract - Extract text from URL or uploaded file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, url, filename, mime_type, data } = body as {
      type: 'url' | 'file'
      url?: string
      filename?: string
      mime_type?: string
      data?: string // Base64-encoded file data
    }

    if (type === 'url') {
      if (!url) {
        return NextResponse.json(
          { error: 'url is required for URL extraction' },
          { status: 400 }
        )
      }

      const result = await extractFromUrl(url)
      return NextResponse.json(result)
    }

    if (type === 'file') {
      if (!data || !filename) {
        return NextResponse.json(
          { error: 'data and filename are required for file extraction' },
          { status: 400 }
        )
      }

      const result = await extractFromFile(data, filename, mime_type || '')
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'type must be "url" or "file"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error extracting content:', error)
    const message = error instanceof Error ? error.message : 'Failed to extract content'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

async function extractFromUrl(url: string): Promise<{ title: string; content: string; word_count: number }> {
  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported')
  }

  // Fetch the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LI-Creator/1.0)',
      'Accept': 'text/html,application/xhtml+xml,text/plain',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const html = await response.text()

  // If plain text, return directly
  if (contentType.includes('text/plain')) {
    const title = parsedUrl.hostname + parsedUrl.pathname
    return {
      title,
      content: html.trim(),
      word_count: countWords(html),
    }
  }

  // Extract text from HTML
  const content = extractTextFromHtml(html)
  const title = extractTitleFromHtml(html) || parsedUrl.hostname + parsedUrl.pathname

  if (!content.trim()) {
    throw new Error('Could not extract meaningful text from this URL')
  }

  return {
    title,
    content: content.trim(),
    word_count: countWords(content),
  }
}

async function extractFromFile(
  base64Data: string,
  filename: string,
  mimeType: string
): Promise<{ title: string; content: string; word_count: number }> {
  const buffer = Buffer.from(base64Data, 'base64')
  const ext = filename.toLowerCase().split('.').pop()

  // Plain text or markdown
  if (ext === 'txt' || ext === 'md' || mimeType.includes('text/plain') || mimeType.includes('text/markdown')) {
    const content = buffer.toString('utf-8')
    return {
      title: filename.replace(/\.[^.]+$/, ''),
      content,
      word_count: countWords(content),
    }
  }

  // PDF
  if (ext === 'pdf' || mimeType.includes('application/pdf')) {
    try {
      // Dynamic import to avoid issues if pdf-parse has initialization side effects
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      const pdfData = await parser.getText()
      const content = pdfData.text

      if (!content.trim()) {
        throw new Error('PDF appears to be image-only or contains no extractable text')
      }

      return {
        title: filename.replace(/\.[^.]+$/, ''),
        content: content.trim(),
        word_count: countWords(content),
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('image-only')) {
        throw err
      }
      throw new Error(`Failed to parse PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  throw new Error(`Unsupported file type: ${ext || mimeType}. Supported: .txt, .md, .pdf`)
}

function extractTextFromHtml(html: string): string {
  // Remove script, style, nav, footer, header tags and their contents
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')

  // Try to extract from article or main if present
  const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i)

  if (articleMatch) {
    text = articleMatch[1]
  } else if (mainMatch) {
    text = mainMatch[1]
  }

  // Replace block elements with newlines
  text = text
    .replace(/<(p|div|h[1-6]|li|br|tr)[^>]*>/gi, '\n')
    .replace(/<\/?(ul|ol|table|tbody|thead)[^>]*>/gi, '\n')

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()

  return text
}

function extractTitleFromHtml(html: string): string | null {
  // Try og:title first
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (ogMatch) return ogMatch[1]

  // Then <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()

  // Then first h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()

  return null
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
