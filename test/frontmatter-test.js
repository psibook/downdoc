'use strict'

const { assert, describe, heredoc, it } = require('./harness')
const downdoc = require('downdoc')

describe('downdoc() — yaml frontmatter', () => {
  describe('T1 — no false positives (R8)', () => {
    it('should emit no frontmatter block when no document-header attributes are present', () => {
      const input = heredoc`
      = Title

      Body.
      `
      const expected = heredoc`
      # Title

      Body.
      `
      assert.equal(downdoc(input, { frontmatterVendor: 'claude' }), expected)
    })

    it('should not emit a frontmatter block when header attributes do not match the frontmatter pattern', () => {
      const input = heredoc`
      = Title
      :author: Some Author
      :other-attribute: value

      Body.
      `
      const result = downdoc(input, { frontmatterVendor: 'claude' })
      assert.equal(result.startsWith('---\n'), false)
    })

    it('should not emit a frontmatter block when a frontmatter attribute is from a different vendor', () => {
      const input = heredoc`
      = Title
      :frontmatter-gemini-memory-name: Gemini Only

      Body.
      `
      const result = downdoc(input, { frontmatterVendor: 'claude' })
      assert.equal(result.startsWith('---\n'), false)
    })
  })

  describe('T2 — full frontmatter emission with kebab→camelCase (R2, R5)', () => {
    it('should emit YAML frontmatter for the four canonical claude-memory attributes', () => {
      const input = heredoc`
      = Memory Title
      :frontmatter-claude-memory-name: Roof Test
      :frontmatter-claude-memory-description: A named test pattern
      :frontmatter-claude-memory-type: feedback
      :frontmatter-claude-memory-origin-session-id: 4b69ca29-dc2a-4765-b3f9-9d7a0925322d

      Body content.
      `
      const expected = heredoc`
      ---
      name: Roof Test
      description: A named test pattern
      type: feedback
      originSessionId: 4b69ca29-dc2a-4765-b3f9-9d7a0925322d
      ---

      # Memory Title

      Body content.
      `
      assert.equal(downdoc(input, { frontmatterVendor: 'claude' }), expected)
    })

    it('should translate every kebab-segment after the namespace prefix into camelCase', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-multi-word-field-name: value

      Body.
      `
      const expected = heredoc`
      ---
      multiWordFieldName: value
      ---

      # Title

      Body.
      `
      assert.equal(downdoc(input, { frontmatterVendor: 'claude' }), expected)
    })

    it('should leave single-word field names untouched (no false-camel)', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Single

      Body.
      `
      const result = downdoc(input, { frontmatterVendor: 'claude' })
      assert.equal(result.includes('\nname: Single\n'), true)
    })
  })

  describe('T3 — multi-line continuation joins with a single space (R6)', () => {
    it('should join AsciiDoctor backslash-continuation values with a single space', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-description: First line of description \\
      second line continued

      Body.
      `
      const expected = heredoc`
      ---
      description: First line of description second line continued
      ---

      # Title

      Body.
      `
      assert.equal(downdoc(input, { frontmatterVendor: 'claude' }), expected)
    })
  })

  describe('T4 — vendor scoping isolates namespaces (R3)', () => {
    it('should emit only the requested vendor namespace when others are also present', () => {
      const input = heredoc`
      = Title
      :frontmatter-gemini-memory-name: Gemini Memory
      :frontmatter-claude-memory-name: Claude Memory

      Body.
      `
      const expected = heredoc`
      ---
      name: Claude Memory
      ---

      # Title

      Body.
      `
      assert.equal(downdoc(input, { frontmatterVendor: 'claude' }), expected)
    })
  })

  describe('T5 — idempotency (R7)', () => {
    it('should produce byte-identical output on repeated conversion', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Some Name
      :frontmatter-claude-memory-type: feedback

      Body paragraph.
      `
      const first = downdoc(input, { frontmatterVendor: 'claude' })
      const second = downdoc(input, { frontmatterVendor: 'claude' })
      assert.equal(first, second)
    })
  })

  describe('T8 — empty body with only frontmatter attributes', () => {
    it('should emit a frontmatter block followed by the title with no body', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Only Frontmatter
      `
      const expected = heredoc`
      ---
      name: Only Frontmatter
      ---

      # Title
      `
      assert.equal(downdoc(input, { frontmatterVendor: 'claude' }), expected)
    })
  })

  describe('T9 — multiple vendor namespaces (R4)', () => {
    it('should emit all matching namespaces when frontmatterVendor=all, grouped by vendor alphabetically', () => {
      const input = heredoc`
      = Title
      :frontmatter-gemini-memory-name: Gemini Name
      :frontmatter-claude-memory-name: Claude Name

      Body.
      `
      const result = downdoc(input, { frontmatterVendor: 'all' })
      const claudeIdx = result.indexOf('Claude Name')
      const geminiIdx = result.indexOf('Gemini Name')
      assert.notEqual(claudeIdx, -1)
      assert.notEqual(geminiIdx, -1)
      assert.equal(claudeIdx < geminiIdx, true)
    })

    it('should accept an array of vendor names and emit only the requested namespaces', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Claude Name
      :frontmatter-gemini-memory-name: Gemini Name
      :frontmatter-openai-memory-name: OpenAI Name

      Body.
      `
      const result = downdoc(input, { frontmatterVendor: ['claude', 'gemini'] })
      assert.equal(result.includes('OpenAI Name'), false)
      assert.equal(result.includes('Claude Name'), true)
      assert.equal(result.includes('Gemini Name'), true)
    })
  })

  describe('T10 — feature is opt-in', () => {
    it('should NOT emit frontmatter when the frontmatterVendor option is omitted', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Some Name

      Body.
      `
      const result = downdoc(input)
      assert.equal(result.startsWith('---'), false)
    })

    it('should NOT emit frontmatter when frontmatterVendor is an empty string', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Some Name

      Body.
      `
      const result = downdoc(input, { frontmatterVendor: '' })
      assert.equal(result.startsWith('---'), false)
    })
  })

  describe('R9 — order stability', () => {
    it('should preserve the source order of attributes within a vendor namespace', () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-type: feedback
      :frontmatter-claude-memory-name: A Name
      :frontmatter-claude-memory-description: A description

      Body.
      `
      const expected = heredoc`
      ---
      type: feedback
      name: A Name
      description: A description
      ---

      # Title

      Body.
      `
      assert.equal(downdoc(input, { frontmatterVendor: 'claude' }), expected)
    })
  })

  describe('R1 — backward compatibility (regression sentinel)', () => {
    it('should produce the same output for a frontmatter-free document whether or not frontmatterVendor is set', () => {
      const input = heredoc`
      = Title
      :author: Some Author

      Body.
      `
      const without = downdoc(input)
      const withVendor = downdoc(input, { frontmatterVendor: 'claude' })
      assert.equal(without, withVendor)
    })
  })
})
