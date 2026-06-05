'use strict'

const { after, assert, assertx, before, beforeEach, cleanDir, describe, heredoc, it, StringIO } = require('./harness')
const downdoc = require('#cli')
const fsp = require('node:fs/promises')
const ospath = require('node:path')
const { Readable } = require('node:stream')
const { version } = require('downdoc/package.json')

const WORK_DIR = ospath.join(__dirname, 'work')

describe('downdoc', () => {
  const lf = '\n'
  const oldcwd = process.cwd()
  let stdout, stderr, example

  before(async () => {
    await cleanDir(WORK_DIR, { create: true })
    process.chdir(WORK_DIR)
  })

  beforeEach(async () => {
    process.chdir(oldcwd)
    await cleanDir(WORK_DIR, { create: true })
    process.chdir(WORK_DIR)
    stdout = new StringIO()
    stderr = new StringIO()
    example = {
      input: heredoc`
      = Document Title

      == Section Title

      Paragraph.${lf}
      `,
      expected: heredoc`
      # Document Title

      ## Section Title

      Paragraph.${lf}
      `,
    }
  })

  after(async () => {
    process.chdir(oldcwd)
    await cleanDir(WORK_DIR)
  })

  describe('info', () => {
    it('should only print version when -v option is specified', async () => {
      const args = ['-v']
      const expected = version + '\n'
      await downdoc({ args, stdout })
      assert.equal(stdout.string, expected)
    })

    it('should only print version when --version option is specified', async () => {
      const args = ['--version']
      const expected = version + '\n'
      await downdoc({ args, stdout })
      assert.equal(stdout.string, expected)
    })

    it('should only print usage when -h option is specified', async () => {
      const args = ['-h']
      const expected = heredoc`
      downdoc ${version}
      Usage: downdoc [OPTION]... FILE
      Convert the specified AsciiDoc FILE to a Markdown file.${lf}
      `
      await downdoc({ args, stdout })
      assertx.startWith(stdout.string, expected)
      assertx.endWith(stdout.string, '\n')
    })

    it('should only print usage when --help option is specified', async () => {
      const args = ['-h']
      const expectedStart = heredoc`
      downdoc ${version}
      Usage: downdoc [OPTION]... FILE
      Convert the specified AsciiDoc FILE to a Markdown file.${lf}
      `
      const expectedIn = '\n  -a, --attribute name=val   set an AsciiDoc attribute; can be specified multiple times\n'
      const expectedEnd = 'If --output is not specified, the output file path is derived from FILE (e.g., README.md).\n'
      await downdoc({ args, stdout })
      assertx.startWith(stdout.string, expectedStart)
      assertx.include(stdout.string, expectedIn)
      assertx.endWith(stdout.string, expectedEnd)
      assertx.endWith(stdout.string, '\n')
    })

    it('should only print usage to stderr and set exit code when no options or arguments are specified', async () => {
      const args = []
      const expected = heredoc`
      Usage: downdoc [OPTION]... FILE
      Run 'downdoc --help' for more information.${lf}
      `
      const p = { args, stdout, stderr }
      await downdoc(p)
      assertx.empty(stdout.string)
      assert.equal(stderr.string, expected)
      assert.equal(p.exitCode, 1)
    })

    it('should only print usage to stderr and set exit code when neither args or argv are set on process', async () => {
      const expected = heredoc`
      Usage: downdoc [OPTION]... FILE
      Run 'downdoc --help' for more information.${lf}
      `
      const p = { stderr }
      await downdoc(p)
      assert.equal(stderr.string, expected)
      assert.equal(p.exitCode, 1)
    })
  })

  describe('output option', () => {
    it('should convert FILE and write output to file in cwd when --output option not specified', async () => {
      const { input, expected } = example
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['doc.adoc']
      await downdoc({ args, stdout })
      assertx.empty(stdout.string)
      assertx.contents('doc.md', expected)
    })

    it('should convert FILE and write output to file in subdir when --output option not specified', async () => {
      const { input, expected } = example
      await fsp.mkdir('docs')
      await fsp.writeFile('docs/doc.adoc', input, 'utf8')
      const args = ['docs/doc.adoc']
      await downdoc({ args })
      assertx.contents('docs/doc.md', expected)
    })

    it('should convert FILE and write output to stdout when -o option is -', async () => {
      const { input, expected } = example
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['-o', '-', 'doc.adoc']
      await downdoc({ args, stdout })
      assert.equal(stdout.string, expected)
      assertx.notPath('doc.md')
    })

    it('should convert FILE and write output to stdout when --output option is -', async () => {
      const { input, expected } = example
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['--output', '-', 'doc.adoc']
      await downdoc({ args, stdout })
      assert.equal(stdout.string, expected)
      assertx.notPath('doc.md')
    })

    it('should convert FILE and write output to adjacent file specified by -o option', async () => {
      const { input, expected } = example
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['-o', 'out.md', 'doc.adoc']
      await downdoc({ args })
      assertx.contents('out.md', expected)
    })

    it('should convert FILE and write output to adjacent file specified by --output option', async () => {
      const { input, expected } = example
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['--output', 'out.md', 'doc.adoc']
      await downdoc({ args })
      assertx.contents('out.md', expected)
    })

    it('should convert FILE and write output to file in different folder specified by -o option', async () => {
      const { input, expected } = example
      await fsp.writeFile('doc.adoc', input, 'utf8')
      await fsp.mkdir('build')
      const args = ['-o', 'build/doc.md', 'doc.adoc']
      await downdoc({ args })
      assertx.contents('build/doc.md', expected)
    })
  })

  describe('input', () => {
    it('should allow input to be specified from stdin by passing - as input path', async () => {
      const args = ['-']
      const expected = '**foo** and _bar_\n'
      const stdin = Readable.from('*foo* and _bar_')
      const p = { args, stdout, stdin }
      await downdoc(p)
      assert.equal(stdout.string, expected)
    })

    it('should print message to stderr and set exit code when FILE is missing', async () => {
      const args = ['no-such-file.adoc']
      const p = { args, stderr }
      await downdoc(p)
      assert.equal(stderr.string, 'downdoc: no-such-file.adoc: No such file\n')
      assert.equal(p.exitCode, 1)
    })

    it('should print message to stderr and set exit code when FILE is directory', async () => {
      await fsp.mkdir('docs')
      const args = ['docs']
      const p = { args, stderr }
      await downdoc(p)
      assert.equal(stderr.string, 'downdoc: docs: Not a file\n')
      assert.equal(p.exitCode, 1)
    })
  })

  describe('attribute option', () => {
    it('should pass attribute specified by -a option', async () => {
      const input = 'Go to {url-order} to purchase your copy.\n'
      const expected = 'Go to https://example.org/order to purchase your copy.\n'
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['-a', 'url-order=https://example.org/order', 'doc.adoc']
      await downdoc({ args })
      assertx.contents('doc.md', expected)
    })

    it('should pass attribute specified by --attribute option', async () => {
      const input = 'Go to {url-order} to purchase your copy.\n'
      const expected = 'Go to https://example.org/order to purchase your copy.\n'
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['-a', 'url-order=https://example.org/order', 'doc.adoc']
      await downdoc({ args })
      assertx.contents('doc.md', expected)
    })

    it('should allow -a option to be specified multiple times', async () => {
      const input = 'Visit {url-site} to learn about {company}.\n'
      const expected = 'Visit https://example.org to learn about ACME.\n'
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['-a', 'url-site=https://example.org', '-a', 'company=ACME', 'doc.adoc']
      await downdoc({ args })
      assertx.contents('doc.md', expected)
    })
  })

  describe('npm publish', () => {
    it('should convert FILE and hide it when --prepublish option is specified', async () => {
      const { input, expected } = example
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['--prepublish', 'doc.adoc']
      await downdoc({ args })
      assertx.contents('doc.md', expected)
      assertx.notPath('doc.adoc')
      assertx.contents('.doc.adoc', input)
    })

    it('should convert FILE in subdir and hide it when --prepublish option is specified', async () => {
      const { input, expected } = example
      await fsp.mkdir('docs')
      await fsp.writeFile('docs/doc.adoc', input, 'utf8')
      const args = ['--prepublish', 'docs/doc.adoc']
      await downdoc({ args })
      assertx.contents('docs/doc.md', expected)
      assertx.notPath('docs/doc.adoc')
      assertx.contents('docs/.doc.adoc', input)
    })

    it('should assume FILE is README.adoc when --prepublish option is specified', async () => {
      const { input, expected } = example
      await fsp.writeFile('README.adoc', input, 'utf8')
      const args = ['--prepublish']
      await downdoc({ args })
      assertx.contents('README.md', expected)
      assertx.notPath('README.adoc')
      assertx.contents('.README.adoc', input)
    })

    it('should set env and env-npm attributes when --prepublish option is specified', async () => {
      let { input, expected } = example
      input += 'ifdef::env-npm[{env}]\n'
      expected += 'npm\n'
      await fsp.writeFile('README.adoc', input, 'utf8')
      const args = ['--prepublish']
      await downdoc({ args })
      assertx.contents('README.md', expected)
    })

    it('should set env and env-npm attributes when --prepublish option and -a options are specified', async () => {
      let { input, expected } = example
      input += 'ifdef::env-npm[{env} {scope}]\n'
      expected += 'npm @org\n'
      await fsp.writeFile('README.adoc', input, 'utf8')
      const args = ['--prepublish', '-a', 'scope=@org']
      await downdoc({ args })
      assertx.contents('README.md', expected)
    })

    it('should restore FILE when --postpublish option is specified', async () => {
      const { input } = example
      await fsp.writeFile('doc.adoc', input, 'utf8')
      await downdoc({ args: ['--prepublish', 'doc.adoc'] })
      await downdoc({ args: ['--postpublish', 'doc.adoc'] })
      assertx.notPath('doc.md')
      assertx.notPath('.doc.adoc')
      assertx.contents('doc.adoc', input)
    })

    it('should assume FILE is README.adoc when --postpublish option is specified', async () => {
      const { input } = example
      await fsp.writeFile('README.adoc', input, 'utf8')
      await downdoc({ args: ['--prepublish'] })
      await downdoc({ args: ['--postpublish'] })
      assertx.notPath('README.md')
      assertx.notPath('.README.adoc')
      assertx.contents('README.adoc', input)
    })

    it('should take no action if there is no file to restore', async () => {
      const { input } = example
      await fsp.writeFile('README.adoc', input, 'utf8')
      await downdoc({ args: ['--postpublish'] })
      assertx.notPath('README.md')
      assertx.notPath('.README.adoc')
      assertx.contents('README.adoc', input)
    })
  })

  describe('integration', () => {
    it('should use global process variable by default', async () => {
      const oldprocess = global.process
      try {
        global.process = { argv: ['node', 'downdoc', '-o', '-', 'doc.adoc'], stdout }
        const { input, expected } = example
        await fsp.writeFile('doc.adoc', input, 'utf8')
        await downdoc()
        assert.equal(stdout.string, expected)
        assertx.notPath('doc.md')
      } finally {
        global.process = oldprocess
      }
    })

    it('should accept options and arguments in any order', async () => {
      const input = 'Visit {url-site} to learn about {company}.\n'
      const expected = 'Visit https://example.org to learn about ACME.\n'
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['-a', 'url-site=https://example.org', 'doc.adoc', '-a', 'company=ACME', '-o', 'out.md']
      await downdoc({ args })
      assertx.contents('out.md', expected)
    })
  })

  describe('frontmatter vendor option', () => {
    it('should emit YAML frontmatter when --frontmatter-vendor=claude is specified', async () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: From CLI

      Body.${lf}
      `
      const expected = heredoc`
      ---
      name: From CLI
      ---

      # Title

      Body.${lf}
      `
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['--frontmatter-vendor=claude', 'doc.adoc']
      await downdoc({ args, stdout })
      assertx.empty(stdout.string)
      assertx.contents('doc.md', expected)
    })

    it('should NOT emit YAML frontmatter when --frontmatter-vendor is not specified', async () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Should be ignored

      Body.${lf}
      `
      const expected = heredoc`
      # Title

      Body.${lf}
      `
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['doc.adoc']
      await downdoc({ args })
      assertx.contents('doc.md', expected)
    })

    it('should emit alphabetically-grouped frontmatter when --frontmatter-vendor=all is specified', async () => {
      const input = heredoc`
      = Title
      :frontmatter-gemini-memory-name: Gemini
      :frontmatter-claude-memory-name: Claude

      Body.${lf}
      `
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['--frontmatter-vendor=all', 'doc.adoc']
      await downdoc({ args })
      const result = await fsp.readFile('doc.md', 'utf8')
      const claudeIdx = result.indexOf('Claude')
      const geminiIdx = result.indexOf('Gemini')
      assert.notEqual(claudeIdx, -1)
      assert.notEqual(geminiIdx, -1)
      assert.equal(claudeIdx < geminiIdx, true)
    })

    it('should accept --frontmatter-vendor specified multiple times and emit only those namespaces', async () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Claude
      :frontmatter-gemini-memory-name: Gemini
      :frontmatter-openai-memory-name: OpenAI

      Body.${lf}
      `
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['--frontmatter-vendor=claude', '--frontmatter-vendor=gemini', 'doc.adoc']
      await downdoc({ args })
      const result = await fsp.readFile('doc.md', 'utf8')
      assert.equal(result.includes('OpenAI'), false)
      assert.equal(result.includes('Claude'), true)
      assert.equal(result.includes('Gemini'), true)
    })

    it('should write YAML frontmatter to stdout when -o is -', async () => {
      const input = heredoc`
      = Title
      :frontmatter-claude-memory-name: Stdout

      Body.${lf}
      `
      const expected = heredoc`
      ---
      name: Stdout
      ---

      # Title

      Body.${lf}
      `
      await fsp.writeFile('doc.adoc', input, 'utf8')
      const args = ['--frontmatter-vendor=claude', '-o', '-', 'doc.adoc']
      await downdoc({ args, stdout })
      assert.equal(stdout.string, expected)
      assertx.notPath('doc.md')
    })

    it('should include --frontmatter-vendor in --help output', async () => {
      const args = ['--help']
      await downdoc({ args, stdout })
      assertx.include(stdout.string, '--frontmatter-vendor name')
      assertx.include(stdout.string, 'emit YAML frontmatter')
    })
  })
})
