# DEBUG.md — downdoc fork

How to develop, test, and debug downdoc.

---

## Setup (first time on a new machine)

```bash
cd ~/continental/software/cases/downdoc/.claude/worktrees/yaml-frontmatter
npm install      # installs nothing (zero deps) but creates package-lock state
npm test         # runs the full test suite; should be all green
```

---

## Running tests

```bash
# Full suite
npm test

# Single suite (by filename match)
node --test test/downdoc-test.js
node --test test/frontmatter-test.js
node --test test/cli-test.js

# With coverage
npm run coverage
```

---

## Running the converter

```bash
# From inside the worktree
node bin/downdoc README.adoc

# Or after npm link
npm link
downdoc --frontmatter-vendor=claude README.adoc

# Inspect frontmatter emission directly
node -e "const dd = require('./lib'); console.log(dd('= Title\n:frontmatter-claude-memory-name: Demo\n\nBody.', { frontmatterVendor: 'claude' }))"

# Inspect attribute parsing without converting
node -e "const dd = require('./lib'); console.log(dd('= Title\n:foo: bar\n\nBody'))"
```

---

## Distribution to other machines

```bash
# Install from GitHub branch (while feature is in development)
npm install -g github:psibook/downdoc#feature/yaml-frontmatter

# Install from the fork's main (once feature lands)
npm install -g github:psibook/downdoc

# Verify
downdoc --version
```

---

## Upstream sync (run monthly or after upstream releases)

```bash
cd ~/continental/software/cases/downdoc                       # main checkout, NOT the worktree
git fetch upstream
git checkout main
git merge --ff-only upstream/main                             # main should ALWAYS fast-forward
git push origin main

# Now rebase each active feature branch
git checkout feature/yaml-frontmatter                         # via worktree cd or git checkout
git rebase main                                               # resolve conflicts if any
npm test                                                      # MUST be green after rebase
git push --force-with-lease origin feature/yaml-frontmatter   # rewritten history needs force-push
```

---

## Codebase orientation

| File | Role |
|---|---|
| `lib/index.js` | The converter — single function `downdoc(input, opts)` returning a string |
| `lib/cli.js` | CLI shim — parses args, reads file, calls `lib/index`, writes output |
| `lib/util/read-stream.js` | Stream helper for stdin input |
| `bin/downdoc` | Executable shim that requires `lib/cli` |
| `test/downdoc-test.js` | Library tests for AsciiDoc → Markdown conversion (the upstream suite) |
| `test/cli-test.js` | CLI shim tests — flag parsing, file IO, help text |
| `test/frontmatter-test.js` | Tests for the `frontmatterVendor` feature (R1–R10) + fixture-based regression |
| `test/fixtures/*.adoc`, `*.expected.md` | Real-world fixtures with paired expected output |

The converter is regex-driven (no AST). Document-header attributes are parsed by a block of code that recognizes the `:name: value` form between `=` title and the first blank line. The frontmatter feature plugs in there.

---

## Test conventions

- Node's built-in `node:test` runner; no external test framework
- Tests use `describe()` / `it()` style
- Fixtures stored as inline strings in test files (small) or `test/fixtures/*.adoc` (large)
- Assertions via `node:assert`'s `strict` API

---

## Common debug tactics

| Symptom | Tactic |
|---|---|
| Converter output doesn't match expectation | `node -e "console.log(require('./lib')(...))"` with the exact input |
| Test fails but won't say why | Run a single test with `node --test --test-name-pattern='<name>' test/<file>` |
| Attribute parsing seems wrong | Add a `console.error(attributes)` near the header-parsing block in `lib/index.js` temporarily |
| CLI flag not recognized | Check `lib/cli.js` arg-parsing block |
| Newline / whitespace artifacts | Diff with `diff -u <(...) <(...)` or `cmp -l file1 file2` for byte-level |

---

## Pitfalls

- `npm install` in this repo installs ZERO production deps. Don't be alarmed.
- `biome` is invoked via `npm run lint` / `npm run format` but isn't a listed dep — npm scripts fetch it on demand (see `postpublish` etc. in package.json).
- The `prepublishOnly` and `postpublish` scripts manipulate README files for npm publishing. Don't run them locally unless you're publishing.

---

## Where to file new issues

`ISSUES.md` in this worktree. Use the template at the bottom.

---

## Where the matching cheatsheet (session-launch) lives

- Canonical: `~/continental/SESSION-LAUNCH-CHEATSHEET.md` (soon `.adoc` once this feature ships)
- Symlinked from `~/.claude/SESSION-LAUNCH-CHEATSHEET.md`
- Read it BEFORE opening a new Code tab for any work in this contract
