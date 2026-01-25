/**
 * Markdown to Portable Text converter
 *
 * Converts basic Markdown syntax to Sanity Portable Text blocks.
 * Supports: headings, bold, italic, links, unordered/ordered lists, code, blockquotes
 */

import {type PortableTextBlock, type PortableTextSpan} from 'sanity'

type BlockStyle = 'normal' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote'
type ListItemType = 'bullet' | 'number'
type MarkType = 'strong' | 'em' | 'code' | 'underline' | 'strike-through'

interface LinkMark {
  _type: 'link'
  _key: string
  href: string
}

type MarkDef = LinkMark

interface TextSpan extends Omit<PortableTextSpan, '_type'> {
  _type: 'span'
  _key: string
  text: string
  marks: string[]
}

interface Block extends Omit<PortableTextBlock, '_type' | 'children'> {
  _type: 'block'
  _key: string
  style: BlockStyle
  children: TextSpan[]
  markDefs: MarkDef[]
  listItem?: ListItemType
  level?: number
}

/**
 * Generate a random key for Portable Text elements
 */
function generateKey(): string {
  return Math.random().toString(36).substring(2, 10)
}

/**
 * Parse inline markdown (bold, italic, links, code) and return spans
 */
function parseInlineMarkdown(text: string): {spans: TextSpan[]; markDefs: MarkDef[]} {
  const spans: TextSpan[] = []
  const markDefs: MarkDef[] = []
  let lastIndex = 0

  // Collect all matches with their positions
  interface Match {
    index: number
    length: number
    text: string
    marks: MarkType[]
    linkMark?: MarkDef
  }

  const matches: Match[] = []

  // Find all links first (they're most complex)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let linkMatch
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    const markDef: MarkDef = {
      _type: 'link',
      _key: generateKey(),
      href: linkMatch[2],
    }
    markDefs.push(markDef)
    matches.push({
      index: linkMatch.index,
      length: linkMatch[0].length,
      text: linkMatch[1],
      marks: [],
      linkMark: markDef,
    })
  }

  // Find bold+italic
  const boldItalicRegex = /(\*\*\*|___)(.+?)\1/g
  let biMatch
  while ((biMatch = boldItalicRegex.exec(text)) !== null) {
    // Skip if overlaps with existing match
    if (!matches.some((m) => overlaps(m.index, m.length, biMatch!.index, biMatch![0].length))) {
      matches.push({
        index: biMatch.index,
        length: biMatch[0].length,
        text: biMatch[2],
        marks: ['strong', 'em'],
      })
    }
  }

  // Find bold
  const boldRegex = /(\*\*|__)(.+?)\1/g
  let boldMatch
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    if (!matches.some((m) => overlaps(m.index, m.length, boldMatch!.index, boldMatch![0].length))) {
      matches.push({
        index: boldMatch.index,
        length: boldMatch[0].length,
        text: boldMatch[2],
        marks: ['strong'],
      })
    }
  }

  // Find italic
  const italicRegex = /(\*|_)([^*_]+?)\1/g
  let italicMatch
  while ((italicMatch = italicRegex.exec(text)) !== null) {
    if (
      !matches.some((m) => overlaps(m.index, m.length, italicMatch!.index, italicMatch![0].length))
    ) {
      matches.push({
        index: italicMatch.index,
        length: italicMatch[0].length,
        text: italicMatch[2],
        marks: ['em'],
      })
    }
  }

  // Find inline code
  const codeRegex = /`([^`]+)`/g
  let codeMatch
  while ((codeMatch = codeRegex.exec(text)) !== null) {
    if (!matches.some((m) => overlaps(m.index, m.length, codeMatch!.index, codeMatch![0].length))) {
      matches.push({
        index: codeMatch.index,
        length: codeMatch[0].length,
        text: codeMatch[1],
        marks: ['code'],
      })
    }
  }

  // Find strikethrough
  const strikeRegex = /~~(.+?)~~/g
  let strikeMatch
  while ((strikeMatch = strikeRegex.exec(text)) !== null) {
    if (
      !matches.some((m) => overlaps(m.index, m.length, strikeMatch!.index, strikeMatch![0].length))
    ) {
      matches.push({
        index: strikeMatch.index,
        length: strikeMatch[0].length,
        text: strikeMatch[1],
        marks: ['strike-through'],
      })
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index)

  // Build spans
  lastIndex = 0
  for (const match of matches) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index)
      if (plainText) {
        spans.push({
          _type: 'span',
          _key: generateKey(),
          text: plainText,
          marks: [],
        })
      }
    }

    // Add the marked span
    const marksList: string[] = [...match.marks]
    if (match.linkMark) {
      marksList.push(match.linkMark._key)
    }

    spans.push({
      _type: 'span',
      _key: generateKey(),
      text: match.text,
      marks: marksList,
    })

    lastIndex = match.index + match.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText) {
      spans.push({
        _type: 'span',
        _key: generateKey(),
        text: remainingText,
        marks: [],
      })
    }
  }

  // If no spans were created, create a single plain span
  if (spans.length === 0) {
    spans.push({
      _type: 'span',
      _key: generateKey(),
      text: text,
      marks: [],
    })
  }

  return {spans, markDefs}
}

/**
 * Check if two ranges overlap
 */
function overlaps(start1: number, len1: number, start2: number, len2: number): boolean {
  const end1 = start1 + len1
  const end2 = start2 + len2
  return start1 < end2 && start2 < end1
}

/**
 * Parse a single line and return its block style and content
 */
function parseLine(line: string): {
  style: BlockStyle
  content: string
  listItem?: ListItemType
  level?: number
} {
  const trimmed = line.trim()

  // Check for headings
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
  if (headingMatch) {
    const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
    return {
      style: `h${level}` as BlockStyle,
      content: headingMatch[2],
    }
  }

  // Check for blockquote
  if (trimmed.startsWith('>')) {
    return {
      style: 'blockquote',
      content: trimmed.replace(/^>\s*/, ''),
    }
  }

  // Check for unordered list
  const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/)
  if (bulletMatch) {
    return {
      style: 'normal',
      content: bulletMatch[1],
      listItem: 'bullet',
      level: 1,
    }
  }

  // Check for ordered list
  const numberMatch = trimmed.match(/^\d+\.\s+(.+)$/)
  if (numberMatch) {
    return {
      style: 'normal',
      content: numberMatch[1],
      listItem: 'number',
      level: 1,
    }
  }

  return {
    style: 'normal',
    content: trimmed,
  }
}

/**
 * Convert Markdown text to Portable Text blocks
 */
export function markdownToPortableText(markdown: string): Block[] {
  if (!markdown || typeof markdown !== 'string') {
    return []
  }

  const blocks: Block[] = []

  // Split into lines, but preserve paragraph breaks
  const paragraphs = markdown.split(/\n\n+/)

  for (const paragraph of paragraphs) {
    const lines = paragraph.split('\n')

    for (const line of lines) {
      if (!line.trim()) {
        continue
      }

      const {style, content, listItem, level} = parseLine(line)
      const {spans, markDefs} = parseInlineMarkdown(content)

      const block: Block = {
        _type: 'block',
        _key: generateKey(),
        style,
        children: spans,
        markDefs,
      }

      if (listItem) {
        block.listItem = listItem
        block.level = level
      }

      blocks.push(block)
    }
  }

  return blocks
}

/**
 * Check if a string contains Markdown syntax
 */
export function containsMarkdown(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false
  }

  const markdownPatterns = [
    /^#{1,6}\s/, // Headings
    /\*\*[^*]+\*\*/, // Bold
    /__[^_]+__/, // Bold alt
    /\*[^*]+\*/, // Italic
    /_[^_]+_/, // Italic alt
    /\[.+\]\(.+\)/, // Links
    /`[^`]+`/, // Inline code
    /^[-*+]\s/, // Unordered list
    /^\d+\.\s/, // Ordered list
    /^>\s/, // Blockquote
    /~~.+~~/, // Strikethrough
  ]

  return markdownPatterns.some((pattern) => pattern.test(text))
}

/**
 * Convert plain text to a simple Portable Text block (for non-markdown content)
 */
export function textToPortableText(text: string): Block[] {
  if (!text || typeof text !== 'string') {
    return []
  }

  // Split by newlines to create separate paragraphs
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim())

  return paragraphs.map((paragraph) => ({
    _type: 'block' as const,
    _key: generateKey(),
    style: 'normal' as BlockStyle,
    children: [
      {
        _type: 'span' as const,
        _key: generateKey(),
        text: paragraph.trim(),
        marks: [],
      },
    ],
    markDefs: [],
  }))
}
