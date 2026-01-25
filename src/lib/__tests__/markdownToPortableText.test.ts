import {describe, expect, it} from 'vitest'

import {
  containsMarkdown,
  markdownToPortableText,
  textToPortableText,
} from '../markdownToPortableText'

describe('markdownToPortableText', () => {
  it('should convert plain text to a single block', () => {
    const result = markdownToPortableText('Hello world')

    expect(result).toHaveLength(1)
    expect(result[0]._type).toBe('block')
    expect(result[0].style).toBe('normal')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].text).toBe('Hello world')
    expect(result[0].children[0].marks).toEqual([])
  })

  it('should handle empty input', () => {
    expect(markdownToPortableText('')).toEqual([])
    expect(markdownToPortableText(null as unknown as string)).toEqual([])
    expect(markdownToPortableText(undefined as unknown as string)).toEqual([])
  })

  it('should convert h1 heading', () => {
    const result = markdownToPortableText('# Hello')

    expect(result).toHaveLength(1)
    expect(result[0].style).toBe('h1')
    expect(result[0].children[0].text).toBe('Hello')
  })

  it('should convert h2 heading', () => {
    const result = markdownToPortableText('## Subheading')

    expect(result).toHaveLength(1)
    expect(result[0].style).toBe('h2')
    expect(result[0].children[0].text).toBe('Subheading')
  })

  it('should convert h3 through h6 headings', () => {
    const result = markdownToPortableText('### H3\n#### H4\n##### H5\n###### H6')

    expect(result).toHaveLength(4)
    expect(result[0].style).toBe('h3')
    expect(result[1].style).toBe('h4')
    expect(result[2].style).toBe('h5')
    expect(result[3].style).toBe('h6')
  })

  it('should convert bold text with **', () => {
    const result = markdownToPortableText('Hello **world**!')

    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(3)
    expect(result[0].children[0].text).toBe('Hello ')
    expect(result[0].children[0].marks).toEqual([])
    expect(result[0].children[1].text).toBe('world')
    expect(result[0].children[1].marks).toContain('strong')
    expect(result[0].children[2].text).toBe('!')
  })

  it('should convert bold text with __', () => {
    const result = markdownToPortableText('Hello __bold__!')

    expect(result[0].children[1].text).toBe('bold')
    expect(result[0].children[1].marks).toContain('strong')
  })

  it('should convert italic text with *', () => {
    const result = markdownToPortableText('Hello *world*!')

    expect(result[0].children[1].text).toBe('world')
    expect(result[0].children[1].marks).toContain('em')
  })

  it('should convert italic text with _', () => {
    const result = markdownToPortableText('Hello _italic_!')

    expect(result[0].children[1].text).toBe('italic')
    expect(result[0].children[1].marks).toContain('em')
  })

  it('should convert bold italic text with ***', () => {
    const result = markdownToPortableText('Hello ***world***!')

    expect(result[0].children[1].text).toBe('world')
    expect(result[0].children[1].marks).toContain('strong')
    expect(result[0].children[1].marks).toContain('em')
  })

  it('should convert inline code', () => {
    const result = markdownToPortableText('Use `const` keyword')

    expect(result[0].children[1].text).toBe('const')
    expect(result[0].children[1].marks).toContain('code')
  })

  it('should convert strikethrough text', () => {
    const result = markdownToPortableText('This is ~~deleted~~ text')

    expect(result[0].children[1].text).toBe('deleted')
    expect(result[0].children[1].marks).toContain('strike-through')
  })

  it('should convert links', () => {
    const result = markdownToPortableText('Visit [Sanity](https://sanity.io) today')

    expect(result[0].children[1].text).toBe('Sanity')
    expect(result[0].markDefs).toHaveLength(1)
    expect(result[0].markDefs[0]._type).toBe('link')
    expect(result[0].markDefs[0].href).toBe('https://sanity.io')
    expect(result[0].children[1].marks).toContain(result[0].markDefs[0]._key)
  })

  it('should handle multiple links', () => {
    const result = markdownToPortableText(
      'Visit [Google](https://google.com) or [Sanity](https://sanity.io)',
    )

    expect(result[0].markDefs).toHaveLength(2)
    expect(result[0].markDefs[0].href).toBe('https://google.com')
    expect(result[0].markDefs[1].href).toBe('https://sanity.io')
  })

  it('should convert unordered lists with -', () => {
    const result = markdownToPortableText('- Item 1\n- Item 2\n- Item 3')

    expect(result).toHaveLength(3)
    expect(result[0].listItem).toBe('bullet')
    expect(result[0].level).toBe(1)
    expect(result[0].children[0].text).toBe('Item 1')
    expect(result[1].listItem).toBe('bullet')
    expect(result[2].listItem).toBe('bullet')
  })

  it('should convert unordered lists with *', () => {
    const result = markdownToPortableText('* Item 1\n* Item 2')

    expect(result).toHaveLength(2)
    expect(result[0].listItem).toBe('bullet')
    expect(result[1].listItem).toBe('bullet')
  })

  it('should convert ordered lists', () => {
    const result = markdownToPortableText('1. First\n2. Second\n3. Third')

    expect(result).toHaveLength(3)
    expect(result[0].listItem).toBe('number')
    expect(result[0].level).toBe(1)
    expect(result[0].children[0].text).toBe('First')
    expect(result[1].listItem).toBe('number')
    expect(result[2].listItem).toBe('number')
  })

  it('should convert blockquotes', () => {
    const result = markdownToPortableText('> This is a quote')

    expect(result).toHaveLength(1)
    expect(result[0].style).toBe('blockquote')
    expect(result[0].children[0].text).toBe('This is a quote')
  })

  it('should handle multi-line blockquotes', () => {
    const result = markdownToPortableText('> Line 1\n> Line 2')

    expect(result).toHaveLength(2)
    expect(result[0].style).toBe('blockquote')
    expect(result[1].style).toBe('blockquote')
  })

  it('should split paragraphs on double newlines', () => {
    const result = markdownToPortableText('First paragraph.\n\nSecond paragraph.')

    expect(result).toHaveLength(2)
    expect(result[0].children[0].text).toBe('First paragraph.')
    expect(result[1].children[0].text).toBe('Second paragraph.')
  })

  it('should handle mixed content', () => {
    const markdown = `# Welcome

This is a **bold** statement with a [link](https://example.com).

- Item with *emphasis*
- Another item

> A thoughtful quote`

    const result = markdownToPortableText(markdown)

    expect(result.length).toBeGreaterThan(3)
    expect(result[0].style).toBe('h1')
    expect(result[0].children[0].text).toBe('Welcome')
  })
})

describe('textToPortableText', () => {
  it('should convert plain text to blocks', () => {
    const result = textToPortableText('Hello world')

    expect(result).toHaveLength(1)
    expect(result[0]._type).toBe('block')
    expect(result[0].style).toBe('normal')
    expect(result[0].children[0].text).toBe('Hello world')
  })

  it('should split paragraphs', () => {
    const result = textToPortableText('First paragraph.\n\nSecond paragraph.')

    expect(result).toHaveLength(2)
    expect(result[0].children[0].text).toBe('First paragraph.')
    expect(result[1].children[0].text).toBe('Second paragraph.')
  })

  it('should handle empty input', () => {
    expect(textToPortableText('')).toEqual([])
    expect(textToPortableText(null as unknown as string)).toEqual([])
  })
})

describe('containsMarkdown', () => {
  it('should detect headings', () => {
    expect(containsMarkdown('# Heading')).toBe(true)
    expect(containsMarkdown('## Subheading')).toBe(true)
  })

  it('should detect bold text', () => {
    expect(containsMarkdown('**bold**')).toBe(true)
    expect(containsMarkdown('__bold__')).toBe(true)
  })

  it('should detect italic text', () => {
    expect(containsMarkdown('*italic*')).toBe(true)
    expect(containsMarkdown('_italic_')).toBe(true)
  })

  it('should detect links', () => {
    expect(containsMarkdown('[text](url)')).toBe(true)
  })

  it('should detect inline code', () => {
    expect(containsMarkdown('Use `code` here')).toBe(true)
  })

  it('should detect lists', () => {
    expect(containsMarkdown('- item')).toBe(true)
    expect(containsMarkdown('* item')).toBe(true)
    expect(containsMarkdown('1. item')).toBe(true)
  })

  it('should detect blockquotes', () => {
    expect(containsMarkdown('> quote')).toBe(true)
  })

  it('should detect strikethrough', () => {
    expect(containsMarkdown('~~deleted~~')).toBe(true)
  })

  it('should return false for plain text', () => {
    expect(containsMarkdown('Just plain text')).toBe(false)
    expect(containsMarkdown('Hello world')).toBe(false)
  })

  it('should handle empty input', () => {
    expect(containsMarkdown('')).toBe(false)
    expect(containsMarkdown(null as unknown as string)).toBe(false)
  })
})
