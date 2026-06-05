# downdoc-yaml-frontmatter — Kickoff Packet

**To resume this contract:** open a new Claude.app Code tab. In "Project folder," paste the path from **Field 1** below. After the session starts, the verification gate at the bottom of this file MUST pass before any work begins.

---

## Seven-Field Resume Packet (v1.0.0)

| Field | Value |
|---|---|
| 1. Working directory | `/Users/dev/continental/software/cases/downdoc/.claude/worktrees/yaml-frontmatter/` |
| 2. Git repo | `psibook/downdoc` |
| 3. Git branch | `feature/yaml-frontmatter` |
| 4. Worktree | `yaml-frontmatter` |
| 5. Session title | `downdoc-yaml-frontmatter-kickoff` |
| 6. This block | (the Charon prompt with planning-interview answers pre-extracted — see Field 6 expansion below) |
| 7. Bundle path | `/Users/dev/continental/archive/Projects/bundles/2026-05-22-downdoc-yaml-frontmatter-kickoff.bundle` |

---

## Field 6 — Planning-Interview Bypass (Q1–Q5 ANSWERED)

> Charon, I am resuming the `downdoc` contract in the Software suite. The planning interview was completed on 2026-05-22 during the testament-session-restart-resume session that opened this contract. Answers follow verbatim — do NOT re-ask.

### Q1 — Is this the most pressing contract on the board?

**✅ ANSWERED.** Yes. This contract blocks three downstream deliverables:

1. The cheatsheet's `.md` derivative (`~/continental/SESSION-LAUNCH-CHEATSHEET.md` once `.adoc` becomes canonical)
2. The format-policy memory file installation (`feedback_asciidoctor_over_markdown.{adoc,md}` — Lieutenant directive 2026-05-18, never installed)
3. The broader `claude-memory-mirror` parking-lot contract's three AsciiDoctor enforcement layers

Until this contract ships, those three are stalled on either a bash-wrapper workaround or no progress at all. The Lieutenant filed this 2026-05-22 with explicit prioritization: "Frontmatter + several other tweaks" — meaning ongoing customization expected.

### Q2 — What is the goal of this contract?

**✅ ANSWERED.** Add native YAML frontmatter generation to `downdoc` (forked from `opendevise/downdoc` → `psibook/downdoc`), triggered by a new `--frontmatter-vendor=<name>` CLI flag. When invoked, the converter reads AsciiDoctor document-header attributes matching the pattern `:frontmatter-<vendor>-<artifact>-<field>:` and emits a corresponding YAML frontmatter block at the top of the converted Markdown output, with prefix stripped and remaining kebab-case translated to camelCase.

Worked example (input `.adoc`):

```asciidoc
= Memory Title
:frontmatter-claude-memory-name: Roof Test
:frontmatter-claude-memory-description: A named test pattern — ...
:frontmatter-claude-memory-type: feedback
:frontmatter-claude-memory-origin-session-id: 4b69ca29-dc2a-4765-b3f9-9d7a0925322d

Body content.
```

Becomes (output `.md`):

```markdown
---
name: Roof Test
description: A named test pattern — ...
type: feedback
originSessionId: 4b69ca29-dc2a-4765-b3f9-9d7a0925322d
---

# Memory Title

Body content.
```

Full requirements: see `PLAN.md` §2 (R1–R12).

### Q3 — When the contract is fulfilled, how will you know?

**✅ ANSWERED.** Done criteria:

1. All 426 existing `downdoc` tests pass (regression baseline) — `npm test` shows `pass 426 / fail 0`
2. At least 10 new tests pass covering R1–R12 in PLAN.md
3. End-to-end CLI: `npx downdoc --frontmatter-vendor=claude <cheatsheet-fixture>.adoc` produces a `.md` whose YAML frontmatter is parseable and contains all four canonical fields (`name`, `description`, `type`, `originSessionId`)
4. `README.adoc` has a new section explaining the frontmatter feature with the worked example above
5. `CHANGELOG.adoc` has an entry for the feature
6. Feature branch `feature/yaml-frontmatter` is ready to merge to `psibook/downdoc:main` (or a PR to `opendevise/downdoc:main` is open if upstream contribution is attempted)

### Q4 — Are there artifacts that will be produced? If so, which?

**✅ ANSWERED.** Additional to the existing scaffold (PLAN.md, ISSUES.md, DEBUG.md, KICKOFF-PROMPT.md committed in this session):

| New | `test/frontmatter-test.js` |
| New | `test/fixtures/frontmatter-*.adoc` (input fixtures, ≥6 files) |
| New | `test/fixtures/frontmatter-*.expected.md` (output fixtures, paired) |
| Modified | `lib/index.js` (frontmatter emission code path; preserves existing 426-test surface) |
| Modified | `lib/cli.js` (`--frontmatter-vendor` flag + help text) |
| Modified | `README.adoc` (feature docs + worked example) |
| Modified | `CHANGELOG.adoc` (feature entry) |
| Updated | `PLAN.md` (Findings Log at the bottom) |

### Q5 — Are there test cases that should pass?

**✅ ANSWERED.** Per PLAN.md §5 and the Phase 1 RED-first discipline:

- **T0** — All 426 existing tests (regression baseline)
- **T1** — `.adoc` with no frontmatter attributes → `.md` with no frontmatter block (no false positives)
- **T2** — `.adoc` with all 4 canonical attributes + `--frontmatter-vendor=claude` → `.md` with all 4 YAML keys in original `.adoc`-declared order, kebab→camelCase translated
- **T3** — `.adoc` with multi-line continuation values (using AsciiDoctor's `\` continuation) → `.md` with single-line YAML values, continuation joined by single space
- **T4** — `.adoc` with non-Claude namespace attributes (e.g., `:frontmatter-gemini-foo:`) AND `--frontmatter-vendor=claude` → those attributes NOT in output (vendor scoping isolates namespaces)
- **T5** — Idempotency: run converter twice on same input, `diff -q` returns empty
- **T6** — Cheatsheet's session-launch fixture `.adoc` (to be authored) → `.md` with valid frontmatter parseable by `yq` / `python-yaml` / the Claude harness's loader
- **T7** — End-to-end CLI integration: `npx downdoc --frontmatter-vendor=claude file.adoc` exit 0, output matches expected
- **T8** — Empty `.adoc` document with only frontmatter attributes → `.md` with frontmatter block + empty body
- **T9** — Multiple vendor namespaces with `--frontmatter-vendor=all` → all matching namespaces emitted, grouped alphabetically by vendor
- **T10** — Missing `--frontmatter-vendor` flag with `.adoc` containing `:frontmatter-claude-*:` attributes → those attributes NOT emitted (feature is opt-in)

---

## Verification Gate (FIRST chat action in the resumed session — DO NOT SKIP)

```bash
pwd && git rev-parse --show-toplevel && git branch --show-current && git log --oneline -1
```

Expected output (Lines 1–3 must match EXACTLY; Line 4 is informational — it changes as commits land on the branch):

```
/Users/dev/continental/software/cases/downdoc/.claude/worktrees/yaml-frontmatter
/Users/dev/continental/software/cases/downdoc/.claude/worktrees/yaml-frontmatter
feature/yaml-frontmatter
<short-hash> <commit subject — most recent commit on feature/yaml-frontmatter>
```

**Line 4 reference (current HEAD as of this packet's last update):** the most recent commit on `feature/yaml-frontmatter` at the moment this packet was written. New commits land on this branch as work progresses, so Line 4 will evolve. Do NOT use Line 4 as a strict-equality check — use it only to confirm you're on the expected branch with reachable history.

**The only failure mode that requires ABORT** — Line 3 begins with `claude/<adjective>-<surname>-<hex>` (e.g. `claude/nifty-ishizaka-9ec0b8`). That means Claude.app auto-created a worktree because the path you opened wasn't a registered worktree. STOP, `/exit`, re-launch following the precise instructions at the end of this packet. Do NOT proceed with contract work.

---

## Context lineage

- **Parent session:** `testament-session-restart-resume` (Skills suite worktree at `~/continental/software/cases/Skills/.claude/worktrees/testament-session-restart`)
- **Parent's plan file:** `~/.claude/plans/the-seven-field-packet-linear-biscuit.md`
- **Sibling contract that triggered this:** session-launch cheatsheet work in `~/continental/SESSION-LAUNCH-CHEATSHEET.md`
- **Bundle proves repo state at the moment of handoff** — `git bundle verify <Field 7>` PASSED with 34 refs at session-creation time

## Once the verification gate passes

1. `cat PLAN.md` to load context
2. Start at PLAN.md §3 Phase 1 — RED: write failing tests in `test/frontmatter-test.js`
3. `npm test` — confirm new tests fail (the feature doesn't exist yet)
4. Commit the failing tests with `git commit -m "RED: add failing tests for yaml-frontmatter feature"`
5. Proceed to Phase 2 GREEN
