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
 * Match interface for inline markdown elements
 */
interface InlineMatch {
  index: number
  length: number
  text: string
  marks: MarkType[]
  linkMark?: MarkDef
}

/**
 * Check if a match position overlaps with existing matches
 */
function hasOverlap(matches: InlineMatch[], matchIndex: number, matchLength: number): boolean {
  return matches.some((m) => overlaps(m.index, m.length, matchIndex, matchLength))
}

/**
 * Find all regex matches that don't overlap with existing matches
 * @param text - The text to search
 * @param regex - The regex pattern (must have global flag)
 * @param existingMatches - Array of existing matches to check for overlap
 * @param marks - Mark types to apply to matches
 * @param textGroupIndex - Which capture group contains the matched text
 */
function findNonOverlappingMatches(
  text: string,
  regex: RegExp,
  existingMatches: InlineMatch[],
  marks: MarkType[],
  textGroupIndex: number,
): InlineMatch[] {
  const newMatches: InlineMatch[] = []
  let match = regex.exec(text)

  while (match !== null) {
    const matchIndex = match.index
    const matchLength = match[0].length
    const matchText = match[textGroupIndex]

    if (!hasOverlap(existingMatches, matchIndex, matchLength)) {
      newMatches.push({
        index: matchIndex,
        length: matchLength,
        text: matchText,
        marks: [...marks],
      })
    }

    match = regex.exec(text)
  }

  return newMatches
}

/**
 * Parse inline markdown (bold, italic, links, code) and return spans
 */
function parseInlineMarkdown(text: string): {spans: TextSpan[]; markDefs: MarkDef[]} {
  const markDefs: MarkDef[] = []
  const matches: InlineMatch[] = []

  // Find all links first (they're most complex and have special handling)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let linkMatch = linkRegex.exec(text)
  while (linkMatch !== null) {
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
    linkMatch = linkRegex.exec(text)
  }

  // Find and add non-overlapping matches for each inline style
  // Bold+italic: ***text*** or ___text___
  matches.push(
    ...findNonOverlappingMatches(text, /(\*\*\*|___)(.+?)\1/g, matches, ['strong', 'em'], 2),
  )

  // Bold: **text** or __text__
  matches.push(...findNonOverlappingMatches(text, /(\*\*|__)(.+?)\1/g, matches, ['strong'], 2))

  // Italic: *text* or _text_
  matches.push(...findNonOverlappingMatches(text, /(\*|_)([^*_]+?)\1/g, matches, ['em'], 2))

  // Inline code: `text`
  matches.push(...findNonOverlappingMatches(text, /`([^`]+)`/g, matches, ['code'], 1))

  // Strikethrough: ~~text~~
  matches.push(...findNonOverlappingMatches(text, /~~(.+?)~~/g, matches, ['strike-through'], 1))

  // Build spans from sorted matches
  return buildSpansFromMatches(text, matches, markDefs)
}

/**
 * Build text spans from sorted matches
 */
function buildSpansFromMatches(
  text: string,
  unsortedMatches: InlineMatch[],
  markDefs: MarkDef[],
): {spans: TextSpan[]; markDefs: MarkDef[]} {
  const spans: TextSpan[] = []

  // Sort matches by position
  const matches = [...unsortedMatches].sort((a, b) => a.index - b.index)

  let lastIndex = 0
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
