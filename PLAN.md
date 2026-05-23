# PLAN.md — downdoc fork: native YAML frontmatter

**Contract:** `downdoc` (psibook/downdoc fork of opendevise/downdoc)
**Suite:** Software
**Client:** Lieutenant
**Branch:** `feature/yaml-frontmatter`
**Worktree:** `~/continental/software/cases/downdoc/.claude/worktrees/yaml-frontmatter`
**Opened:** 2026-05-22 (from testament-session-restart session as a context-switch; +1 coin)

---

## 1. Context

The Lieutenant declared a global format policy on 2026-05-18: AsciiDoctor (`.adoc`) is the preferred format for human-consumed files; Markdown (`.md`) is acceptable only where the Claude Code harness REQUIRES it. Memory files in `~/.claude/projects/<slug>/memory/<name>.md` are harness-required `.md` — but per the dual-output rule, they must have a parallel `.adoc` canonical source.

The architectural fork in the road: how to keep the `.adoc` source and the `.md` derivative in sync without drift?

The chosen answer (after research and Lieutenant decision 2026-05-22):
- `.adoc` is canonical, edited by hand.
- `.md` is derived by a converter that runs in a pre-commit hook in `~/continental/`.
- The converter must produce `.md` files with valid YAML frontmatter (`name`, `description`, `type`, `originSessionId`) so the Claude Code harness's auto-memory loader recognizes them.

The recommended converter is `downdoc` by Dan Allen (`mojavelinux`) — the AsciiDoctor team's canonical AsciiDoc-to-Markdown tool. **But downdoc has no frontmatter support.** Per the Lieutenant's direction 2026-05-22, we forked downdoc rather than wrapping it in a bash script, on the rationale that frontmatter handling belongs inside the converter and that several other downdoc customizations are expected over the next year.

This contract delivers that feature in the fork.

---

## 2. Requirements

### Convention (declared 2026-05-22, namespace-prefixed per Lieutenant direction)

AsciiDoctor document-header attributes matching the pattern `frontmatter-<vendor>-<artifact>-<field>` participate in YAML frontmatter generation. Specifically, attributes named:

```
frontmatter-claude-memory-name
frontmatter-claude-memory-description
frontmatter-claude-memory-type
frontmatter-claude-memory-origin-session-id
```

…are emitted as a YAML frontmatter block at the top of the converted `.md` output. The prefix `frontmatter-claude-memory-` is stripped; the remainder is converted from kebab-case to camelCase, producing YAML keys:

```yaml
---
name: <value>
description: <value>
type: <value>
originSessionId: <value>
---
```

The namespace structure scales: `frontmatter-gemini-memory-*` would be Gemini's namespace (not processed by Claude's logic); `frontmatter-claude-skill-*` could be a future Claude skill metadata namespace.

### Functional requirements

1. **R1 — Backward compatibility.** All 426 existing downdoc tests MUST continue to pass. Zero regressions.
2. **R2 — Frontmatter emission.** When a `.adoc` document header contains one or more `frontmatter-<vendor>-<artifact>-<field>:` attributes, the converter emits a YAML frontmatter block (delimited by `---` lines) at the top of the `.md` output, before any other content.
3. **R3 — Vendor scoping.** A `--frontmatter-vendor=<name>` CLI flag (default: none, meaning frontmatter is OFF by default) determines which vendor namespace is emitted. With `--frontmatter-vendor=claude`, only `frontmatter-claude-*` attributes are processed.
4. **R4 — Multi-namespace support.** Multiple `--frontmatter-vendor=<name>` flags can be passed (or `--frontmatter-vendor=all` for all matching namespaces). When multiple namespaces are emitted, attributes are grouped by vendor in alphabetical order.
5. **R5 — Kebab → camelCase translation.** Multi-word fields (e.g., `origin-session-id`) become camelCase YAML keys (`originSessionId`).
6. **R6 — Value preservation.** Attribute values are emitted verbatim. Multi-line attribute values (using AsciiDoctor's `\` continuation) are joined with a single space.
7. **R7 — Idempotency.** Running the converter twice on the same `.adoc` produces byte-identical `.md` output.
8. **R8 — No false positives.** Attributes not matching the frontmatter pattern are NOT included in frontmatter (whether or not they're document-header attributes).
9. **R9 — Order stability.** YAML keys within a vendor namespace are emitted in the order they appeared in the `.adoc` source (preserves authorial intent).

### Non-functional requirements

10. **R10 — Zero new dependencies.** downdoc has zero deps today; the feature must not change that.
11. **R11 — Test coverage parity.** New code paths get test coverage at least as thorough as existing code paths (≥90%).
12. **R12 — Documentation.** README.adoc gets a new section explaining the frontmatter feature, with a worked example.

---

## 3. Approach (RED-first TDD per CLAUDE-CODING-PROTOCOL)

### Phase 1 — RED: write failing tests

Before touching `lib/index.js`, write tests in `test/frontmatter-test.js` that exercise every requirement. Run `npm test` — these tests FAIL (the feature doesn't exist yet). Commit with message documenting the failures.

### Phase 2 — GREEN: minimum implementation

Read `lib/index.js` carefully — understand the existing converter architecture. Locate the document-header parsing logic. Add the frontmatter-emission code path. Run `npm test` — new tests pass; existing 426 tests still pass. Commit.

### Phase 3 — CLI flag wiring

Add `--frontmatter-vendor=<name>` to `lib/cli.js` (and the help text). Verify via integration test (CLI runs end-to-end, produces expected `.md`). Commit.

### Phase 4 — Documentation

Update README.adoc with the feature documentation + worked example. Add a CHANGELOG entry. Commit.

### Phase 5 — Real-world fixture validation

Author `feedback_asciidoctor_over_markdown.adoc` (the format-policy memory file from the kickoff plan), run the new converter, verify the produced `.md` has all required YAML frontmatter and loads cleanly. Commit the fixture + result to `test/fixtures/`.

### Phase 6 — Distribution

Document `npm install -g github:psibook/downdoc#feature/yaml-frontmatter` in DEBUG.md. Once feature is stable, merge to `main` of `psibook/downdoc` and tag a release (e.g., `1.1.0-stable-claude.1`).

### Phase 7 — Upstream PR (optional, follow-on)

File a PR against `opendevise/downdoc` proposing the feature for upstream inclusion. If accepted: dissolve fork, install mainline. If declined: maintain fork, document Dan's reasoning.

---

## 4. Critical Files

| Path | Role |
|---|---|
| `lib/index.js` (27 KB, ~1500 lines) | The parser/converter — main mod target |
| `lib/cli.js` (4.3 KB) | CLI shim — needs `--frontmatter-vendor` flag |
| `test/` | 28 test suites, 426 tests — must remain green |
| `test/frontmatter-test.js` (new) | New tests for this feature |
| `test/fixtures/frontmatter-*.adoc` (new) | Hand-authored input fixtures |
| `test/fixtures/frontmatter-*.expected.md` (new) | Expected output fixtures |
| `README.adoc` | Update with feature docs |
| `CHANGELOG.adoc` | Add entry |
| `package.json` | Possibly bump version |

---

## 5. Verification

- **Regression**: `npm test` shows all 426 existing tests passing
- **New feature tests**: ≥10 new tests covering R1–R12
- **End-to-end**: feed the cheatsheet's `:frontmatter-claude-memory-*:` fixture through `npx downdoc --frontmatter-vendor=claude fixture.adoc`, verify output `.md` parses as valid YAML+Markdown and matches expected
- **Idempotency**: run converter twice on same input, `diff -q` returns empty

---

## 6. Distribution Strategy

| Stage | Mechanism |
|---|---|
| Development | `npm install -g github:psibook/downdoc#feature/yaml-frontmatter` |
| Stable (post-merge to fork main) | `npm install -g github:psibook/downdoc` |
| If accepted upstream | `npm install -g downdoc` (mainline) |
| If declined upstream (long-term) | Publish `@psibook/downdoc` to npm under a scoped name |

---

## 7. Upstream-Sync Discipline

- Once a month (or after any upstream release): `git fetch upstream && git rebase upstream/main` on each active branch
- Resolve conflicts in favor of the feature; document any conflict patterns in DEBUG.md
- If upstream introduces breaking changes that conflict with our feature: file an ISSUE, decide whether to adapt or freeze on a prior upstream version

---

## 8. Out-of-scope (deliberate)

- Markdown → AsciiDoctor reverse conversion (out of scope for this fork; existing tools like `kramdoc` handle that)
- Admonition styling customizations (parked for future contracts)
- Table-rendering customizations (parked)
- A `downdoc` wrapper that auto-detects frontmatter-bearing files (out of scope; the `--frontmatter-vendor` flag is explicit)

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| R1: Upstream PR declined → maintain fork forever | Plan for it — distribution strategy includes scoped npm name |
| R2: Upstream changes break our feature on rebase | Monthly rebase cadence catches drift early; tests catch regressions |
| R3: AsciiDoctor attribute syntax doesn't carry every value type we need (e.g., booleans, lists) | Limit Phase 1 to string-valued attributes; defer richer types to follow-on |
| R4: Pre-commit hook in ~/continental/ may diverge from this converter's behavior | Hook calls THIS converter; sync is by construction |

---

## 10. Coin & Suite Accounting

- Opened mid-session from testament-session-restart: -1 coin (will reconcile at /parlay)
- Same suite (Software), no Rule 1 violation
- All work happens in this worktree; no cross-suite artifacts

---

## Findings Log (post-session entries land here per CLAUDE.md Debrief Rule)

### Session 2026-05-22 — Phases 1 through 6 delivered (Charon: Claude Opus 4.7 1M context)

**Phases shipped this session:**

| Phase | Commit | Delivered |
|---|---|---|
| 1 (RED) | `eb21b46` | `test/frontmatter-test.js` with 16 tests (9 failing, 7 sentinels) |
| 2 (GREEN) | `bd3888e` | `lib/index.js` implementation (42 net new lines); +2 sentinels; +1 coverage test for line 384 |
| 3 (RED-cli) | `52adf15` | `test/cli-test.js` frontmatter block (5 failing, 1 sentinel) |
| 3 (GREEN-cli) | `423b79f` | `lib/cli.js` flag wiring + `printUsage` formatter fix |
| 4 (docs) | `0155dc8` | `README.adoc` YAML frontmatter section + `CHANGELOG.adoc` Unreleased entry |
| 5 (fixture) | `00eaeb6` | `test/fixtures/feedback_asciidoctor_over_markdown.{adoc,expected.md}` + 2 fixture-based tests |
| 6 (debug) | `0acfb00` | `DEBUG.md` refresh |

**Final metrics (after `0acfb00`):**

- Tests: **453 / 453 pass** (426 baseline + 27 new feature/coverage tests)
- Coverage on `lib/index.js`: 100% statements / 100% branches / 100% functions / 100% lines
- Coverage on `lib/cli.js`: 100% statements / 100% branches / 100% functions / 100% lines
- Lint: clean (`npx -y @biomejs/biome@~2.4 lint --error-on-warnings`)

**Done criteria status** (from KICKOFF-PROMPT.md Q3, all six PASS):

1. All 426 existing tests pass — confirmed on every run since RED.
2. ≥10 new tests covering R1–R12 — 26 new feature-related tests (18 lib + 6 CLI + 2 fixture).
3. CLI end-to-end produces parseable YAML with 4 canonical fields — verified via fixture + structural YAML check.
4. README has new section with worked example — `[#yaml-frontmatter]` section, dogfood-rendered.
5. CHANGELOG has entry — Unreleased / Added section.
6. Branch ready to merge to `psibook/downdoc:main` — yes (7 commits ahead of origin/feature/yaml-frontmatter).

---

### Findings F1–F10 (chronological)

**F1 — Biome's `useOptionalChain` rule treats `&& obj.size` as a warning, and `--error-on-warnings` makes warnings fatal.** First run of `npm run lint` after the Phase 2 GREEN edits flagged `if (frontmatter && frontmatter.size)` and required `if (frontmatter?.size)` instead. The `--error-on-warnings` flag in the `lint` script (package.json line 27) means biome warnings exit non-zero. Fix was a one-character edit. **Lesson for this repo:** prefer optional chaining wherever biome will flag it; running lint as a separate step (not as part of `npm test`) means lint regressions can sneak past tests.

**F2 — `npm run coverage` requires `reports/` to exist before it runs.** First coverage run failed with `ENOENT: no such file or directory, open 'reports/tests-xunit.xml'` because the test reporter writes the JUnit XML file before nyc creates the directory. Workaround: `mkdir -p reports` before `npm run coverage`. `reports/` is gitignored (`/reports/` in `.gitignore`), so the dir is not checked in; it must be re-created on a fresh checkout. **Potential fix (not applied):** add `reports/` to the npm script via `mkdir -p reports && npx -y nyc ...`. Deferred — out of scope for this contract.

**F3 — Coverage discipline: distinguish "your code's gaps" from "pre-existing gaps" via `git stash`.** First coverage run after Phase 2 GREEN reported 99.74% branch coverage on `lib/index.js` with two uncovered branches at lines 53 and 384. To determine whether each was new or pre-existing, the procedure was: `git stash` (move my changes aside) → re-run coverage → see the baseline number → `git stash pop`. Baseline showed 99.86% with line 345 (= line 384 after my insertions) uncovered. Conclusion: line 53 was new (mine), line 384 was pre-existing. **Generalizes** to any feature work that adds branches — always check whether reported uncovered branches are yours before writing tests to cover them.

**F4 — Line 384's `|| idx` defensive fallback is reachable through attribute-substitution-into-macros path.** The `if (~str.indexOf('m:['))` branch in `macros()` (line 384 of `lib/index.js`) has an inner `||` operator: `'$' + (this.pass[Number(idx)] || idx) + '$'`. The truthy side (`this.pass[Number(idx)]`) is reached by every normal stem macro test because `applySubs` pre-encodes `stem:[content]` → `stem:[N]` at line 344 *before* `macros()` runs, populating `this.pass[N]` with the original content. The fallback (`|| idx`) is reached when `stem:[X]` arrives at `macros()` without going through the pre-encoding — specifically, when `{attr}` expansion *during* the `attributes()` substitutor turns into `stem:[...]` *after* the line-344 pre-encoding check. Then `Number("x^2 + y^2") = NaN`, `this.pass[NaN] = undefined`, and the `||` falls through to `idx`. Test added at `test/downdoc-test.js` (the existing stem-macro group) with input `:equation: stem:[x^2 + y^2]` then `{equation}` in body. Output: `$x^2 + y^2$`. This brought `lib/index.js` to 100% branch coverage.

**F5 — `parseArgs` with `multiple: true` always returns an array, even for single-value invocation.** `--frontmatter-vendor=claude` arrives as `values['frontmatter-vendor'] = ['claude']`. The lib API check `frontmatterVendor === 'all'` requires the *string* `'all'`, not `['all']`. Without unwrapping, `--frontmatter-vendor=all` would silently fail (treated as a literal vendor name "all" that no attribute matches). **Fix in `lib/cli.js`:** unwrap single-element arrays before passing through — `const frontmatterVendor = fmv?.length ? (fmv.length === 1 ? fmv[0] : fmv) : undefined`. Two-or-more values keep the array form; single values normalize to a bare string.

**F6 — The existing `printUsage` formatter dropped hints on long-only options.** Original line: `const option = short ? \`-${short}, --${long}${hint ? ' ' + hint : ''}\` : \`--${long}\``. The `hint` was only appended when a short form was present. Fix: `const option = (short ? \`-${short}, --${long}\` : \`--${long}\`) + (hint ? ' ' + hint : '')`. Same behavior for all existing options (none had `hint` without `short`); enables `--frontmatter-vendor name` to display its hint, and generalizes to any future long-only-with-hint options. Caught in-session by writing the help-text RED test (`assertx.include(stdout.string, '--frontmatter-vendor name')`) — the test failed not because the flag was missing from help but because the hint was suppressed.

**F7 — `heredoc` template tag handles backslash-newline correctly for AsciiDoctor continuation fixtures.** In a JS template literal, `\\` is one literal backslash. AsciiDoctor's attribute continuation is `<space><backslash><newline>`. So a fixture expressing continuation is written as:
```js
heredoc`
:foo: First line \\
second line
`
```
which produces the string `:foo: First line \\nsecond line` (with `\\` being one backslash + literal newline). The Phase 2 GREEN line-fold pre-pass detects `line.endsWith(' \\')` and joins. Worth noting because the fixture format is subtle — easy to write `\\\\` accidentally and break the continuation match.

**F8 — Off-feature byte-equivalence is enforced by construction, not by retesting after every edit.** The `captureFrontmatter` helper returns `resolved` unchanged when `frontmatter` is null. The line-fold pre-pass is gated on `if (frontmatter)`. The output prepend is gated on `if (frontmatter?.size)`. Three independent gates on the same flag mean the off-feature path executes the same code as the pre-feature baseline. R1 (zero regression on 426 tests) is structurally guaranteed; the green test count on every run is confirmation, not proof. **Discipline:** when adding a feature behind a flag, prefer structural guarantees over post-hoc retesting.

**F9 — The Sentry destructive-action hook correctly blocked a cross-suite write during baseline-coverage investigation.** Attempted `cd /tmp && git clone <worktree> /tmp/downdoc-baseline-test && ... && rm -rf /tmp/downdoc-baseline-test` to verify baseline coverage. The Sentry hook (from the `testament-session-restart` contract's C1/C2/C3 enhancement) blocked the command with `[sentry] authorization precondition FAILED for command: ...`. Worked around using `git stash` instead — same result, no cross-suite write, fully reversible. **Confirms the Sentry's design is working as intended** when sessions inadvertently attempt destructive operations outside their authorized scope.

**F10 — Fixture-based regression tests compare API output `+ '\n'` to CLI-written file contents.** The CLI shim writes `downdoc(input, opts) + '\n'` to its output file (line 39 of `lib/cli.js`), but the API `downdoc(input, opts)` returns the string without trailing newline. The fixture test uses `assert.equal(downdoc(input, { frontmatterVendor: 'claude' }) + '\n', fs.readFileSync(mdPath, 'utf8'))` to match. **Generalization:** any future fixture-based test that loads a CLI-produced `.expected.md` and compares to an API call must apply the `+ '\n'` adjustment.

---

### Coverage of R1–R10 (KICKOFF-PROMPT.md Q3)

| Req | Description | Test(s) |
|---|---|---|
| R1 | Backward compatibility (426 baseline tests pass) | All `downdoc-test.js` + R1 sentinel in `frontmatter-test.js` |
| R2 | Frontmatter emission when attributes match | T2 group (3 tests) |
| R3 | Vendor scoping via single-vendor option | T4 (1 test) |
| R4 | Multi-namespace via `'all'` or array | T9 (2 tests) |
| R5 | Kebab → camelCase translation | T2 group (multi-word + single-word) |
| R6 | Backslash continuation joined with single space | T3 (1 test) |
| R7 | Idempotency | T5 (1 test) |
| R8 | No false positives | T1 group (5 tests including the GREEN-added too-few-segments and body-only sentinels) |
| R9 | Source-order stability within a vendor | R9 group (1 test) |
| R10 | Zero new dependencies | Confirmed — `package.json` `dependencies` field still empty; new code uses only stdlib (`Map`, `Array.prototype` methods, `node:fs`/`node:path` in tests) |
| R11 | Test coverage parity (≥90%) | Achieved 100% on `lib/index.js` and `lib/cli.js` |
| R12 | Documentation | README new section + CHANGELOG entry + dogfood-verified |

Plus 2 CLI tests not previously enumerated:
- CLI flag respects `-o -` (stdout) for frontmatter output
- `--help` shows `--frontmatter-vendor name` with description containing "emit YAML frontmatter"

Plus 2 fixture tests:
- Byte-level regression against `feedback_asciidoctor_over_markdown.expected.md`
- Structural YAML check for the 4 canonical claude-memory keys

---

### Remaining work

- **Phase 7 (optional):** Upstream PR against `opendevise/downdoc`. Lieutenant judgment required on whether to attempt now, after real-world usage settles, or never (maintain fork indefinitely).
- **Downstream unblocks:** The fixture `test/fixtures/feedback_asciidoctor_over_markdown.adoc` is the source for the format-policy memory file install in `~/.claude/projects/<slug>/memory/`. That deployment is downstream of this contract (per CASE-BOARD downdoc row's downstream-unblocks list).

---

### Session 2026-05-23 — Format-policy memory deployment + hook sketch (Charon: Claude Opus 4.7 1M context)

**Contract:** First real-world deployment of the just-shipped `--frontmatter-vendor=claude` feature per the resume packet's bypassed Q1–Q5. Install the format-policy memory file; sketch the downstream `~/continental/` enforcement infrastructure.

**Resume context:** Seven-field replay-packet from 2026-05-22 testament; bundle verified clean (734,570 bytes, 34 refs, SHA-1); four-line verification gate PASSED with `cbf0c82` at HEAD.

**Work delivered:**

| # | Action | Target | Status |
|---|---|---|---|
| 1 | Ratified target memory slug | `~/.claude/projects/-Users-dev-continental/` | DONE — Lieutenant chose Option A (Continental root, no per-case mirror) |
| 2 | Ran production CLI on fixture | `./bin/downdoc --frontmatter-vendor=claude -o -` | PASS — byte-identical to `.expected.md` (1,824 bytes) |
| 3 | Installed canonical `.adoc` | `~/.claude/projects/-Users-dev-continental/memory/feedback_asciidoctor_over_markdown.adoc` | DONE — 1,923 bytes, byte-identical to fixture |
| 4 | Installed derived `.md` | `~/.claude/projects/-Users-dev-continental/memory/feedback_asciidoctor_over_markdown.md` | DONE — 1,824 bytes, byte-identical to `.expected.md` |
| 5 | Updated `MEMORY.md` index | Inserted line 3 of the index list, before `feedback_document_formatting_styles.md` | DONE — all 10 entries resolve to existing files |
| 6 | Verified frontmatter parses | 4 required keys present (`name`, `description`, `type`, `originSessionId`) | PASS — `originSessionId: 4b69ca29-dc2a-4765-b3f9-9d7a0925322d` matches 2026-05-18 origin |
| 7 | Regression test sweep | `npm test` | PASS — 453/453 (no change from Session 2026-05-22 baseline) |
| 8 | Drafted hook + wrapper sketch | `PRE-COMMIT-HOOK-SKETCH.adoc` (canonical) + `.md` (downdoc-derived) | DONE — 8,609 bytes `.adoc`, 8,568 bytes `.md` |
| 9 | This findings entry | PLAN.md §Findings Log | DONE |
| 10 | CASE-BOARD downdoc-row update | `~/continental/CASE-BOARD.md` downstream-unblocks list | (Pending — last task of session) |

**T1–T5 acceptance status** (from resume packet Q5):

| Test | Description | Result |
|---|---|---|
| T1 | Installed `.md` byte-identical to `.expected.md` | PASS — 1,824 bytes, `diff` empty |
| T2 | Installed `.adoc` byte-identical to fixture | PASS — 1,923 bytes, `diff` empty |
| T3 | Fresh session loads the new memory | PROVISIONAL — structural prerequisites verified (MEMORY.md valid, all references resolve, frontmatter parses, 4 canonical keys present). True fresh-session load deferred to next Charon launched at `~/continental/` root, since this session is keyed to the `downdoc` slug and cannot observe the `-Users-dev-continental` slug's loaded memory from inside itself. |
| T4 | Re-running CLI produces byte-identical output | PASS — confirmed in step 2 above |
| T5 | Downdoc test suite still passes 453/453 | PASS — confirmed in step 7 |

### Findings F11–F14 (Session 2026-05-23)

**F11 — Auto-memory loader is keyed per project slug, not "Continental-wide" in any global sense.** A memory file installed at `~/.claude/projects/-Users-dev-continental/memory/` loads ONLY when a session is launched with `~/continental/` as its project folder. Sessions in sub-case directories — like THIS session at `~/continental/software/cases/downdoc/.claude/worktrees/yaml-frontmatter/` — get their OWN project slug's memory dir and do NOT see the Continental-root memory. **Implication:** the format-policy memory installed in this session WILL NOT auto-load into the downdoc session that installed it, nor into any other case session (vibevoice, PSI, sonata-bumper, etc.). It loads only at the Continental-root level. The parking-lot `claude-memory-mirror` contract's per-case mirroring is the ONLY way to make a single "Continental-wide" memory truly visible everywhere. Without it, the format policy reaches case-specific sessions through other channels (CLAUDE.md `@`-references, RULES.md, the case-board, or a Charon's training-time defaults), not through the auto-memory subsystem.

**F12 — `~/.claude/memory/` (global root, outside `projects/`) appears essentially deprecated.** Contains one stale entry (`feedback_debrief.md`, 1,207 bytes, mtime 2026-03-30) and a 122-byte `MEMORY.md` that indexes only that one file. By contrast, `~/.claude/projects/-Users-dev-continental/memory/` is actively maintained with 10 entries (now 11 after this session). The global root dir is not the right home for new feedback memories. **Generalization:** when the auto-memory subsystem offers multiple plausible locations, inspect their recency and population — the active location is obvious from `ls -lt`.

**F13 — First live application of the format policy beyond the memory file itself.** `PRE-COMMIT-HOOK-SKETCH.adoc` (8,609 bytes) is now the canonical source; `PRE-COMMIT-HOOK-SKETCH.md` (8,568 bytes, 41 bytes smaller — downdoc strips/translates AsciiDoctor-specific syntax) is its downdoc-derived companion. This walks the talk of the policy in the very document that designs its enforcement. **Side observation:** the pre-existing Continental docs in this repo (`PLAN.md`, `DEBUG.md`, `ISSUES.md`, `KICKOFF-PROMPT.md`) remain `.md`-only — they pre-date the 2026-05-18 policy. Whether to backfill `.adoc` sources, grandfather them, or leave as-is is Open Question Q3 in the sketch. **Tooling note:** running `./bin/downdoc --frontmatter-vendor=claude PRE-COMMIT-HOOK-SKETCH.adoc` without `-o` derives the output path automatically (input `.adoc` → output `.md` in the same directory) — confirms the CLI's "If --output is not specified, the output file path is derived from FILE" behavior on a non-trivial document.

**F14 — Production install verification by fixture-diff is the cheapest possible deployment check.** Running `./bin/downdoc --frontmatter-vendor=claude -o - test/fixtures/feedback_asciidoctor_over_markdown.adoc` and piping into `diff` against the fixture's `.expected.md` reproduces in-production what the test suite verifies in-repo. Both confirm 1,824 bytes byte-identical, no diff. **Generalizes:** any future packaging contract where the fixture IS the deployment payload can use the fixture-vs-tool-output diff as its deployment smoke test, with zero new tooling. The fixture acts as a contract between the test suite and the production install.

**F15 — Numerical claims about repo state require `git rev-list --count` verification before being written into prose.** The first CASE-BOARD downdoc-row edit asserted "11 commits ahead of `origin/feature/yaml-frontmatter` (8 from Session 2026-05-22 + 3 from this session)" without running `git rev-list --count origin/feature/yaml-frontmatter..HEAD`. The actual count was **1** — origin had been pushed to `cbf0c82` between Session 2026-05-22's testament authoring (which said "push pending") and the start of this session. **Caught by:** the post-commit Preference-3 self-check on the Lieutenant's standing TASTE-PROFILE rule ("state the specific before/after measurement for every adjustment"). **Fixed by:** a follow-up commit on `~/continental` correcting the CASE-BOARD entry to reflect the true `origin == cbf0c82, HEAD == db033a1, 1 commit ahead`. **Generalization for future Charons:** any sentence in a case-board entry, testament, or PLAN.md that contains a count of commits, files, lines, bytes, or tests must be sourced from a verifiable command (e.g., `git rev-list --count`, `git diff --stat`, `wc -l`, `npm test 2>&1 | grep -E 'pass|fail'`) that the same Charon ran in the same session. Counts copied from memory or extrapolated from previous sessions go stale across pushes, force-pushes, rebases, and merges. The trustworthy pattern is: run the command first, paste its output into the prose, then commit.

### Coin & process accounting (Session 2026-05-23)

- **Suite stayed:** Software throughout. No cross-suite work (the install to `~/.claude/projects/-Users-dev-continental/` is global-config infrastructure, not Continental-suite-coded). Single-suite-stay credit: **+2** (post-parlay).
- **Contracts opened:** 0 (continuation of existing downdoc contract).
- **Marker-class actions:** 0 (no public-repo creation, no force-push, no destructive operations).
- **Debrief credit:** **+1** (this findings block).
- **Costs:** **0** coins (no context switch, no new contract, no override).
- **Net session balance impact:** +3 coins, to be applied at `/parlay` and `/checkpoint`.

### What is deferred

- **T3 true fresh-session verification.** Next Charon launched at `~/continental/` should confirm the new memory appears in the system prompt's auto-memory section, and that MEMORY.md reads as expected with the new entry inline.
- **Hook + wrapper implementation.** The sketch is design-only. Implementation belongs in a future Software-suite session focused on `~/continental/` infrastructure — not this contract.
- **Backfill or grandfather decision** for the pre-existing `.md`-only files in this repo (`PLAN.md`, `DEBUG.md`, `ISSUES.md`, `KICKOFF-PROMPT.md`). Open Q3 in the sketch.
- **Phase 7 (upstream PR)** remains the optional follow-on it was at Session 2026-05-22.

---

## Parlay: Session 2026-05-22 (Phases 1–6 delivery)

**Contract:** Phases 1–6 of the YAML frontmatter feature per KICKOFF-PROMPT.md Q1–Q5 (RED tests, GREEN implementation, CLI wiring, docs, fixture, DEBUG.md refresh).
**Actual work:** Matched the contract exactly. No divergence.

**Guest process grade: A**
- One suite (Software), one contract (downdoc), throughout the session.
- Explicit approvals at every phase transition (Y / YES / y / Proceed).
- Mid-execution interventions ("cover the branch", "describe the diff", "what was your original intent") were all quality contributions or legitimate reviews — they produced 100% coverage and shared understanding, not scope drift.
- No new contracts opened; no cross-suite requests; no tangents.

**Hotel process grade: B+**
- Major work was exemplary: RED-first TDD on every phase, surgical edits with structural off-feature byte-equivalence guarantees, tests + lint + coverage gates before each commit, manual smoke tests after each implementation, dogfood-tested documentation, 100% coverage on both `lib/index.js` and `lib/cli.js`.
- **Slip 1 (new):** Compound question at the debrief decision point — wrote "Shall I: 1. Run `/debrief` 2. push…" in one message. The Lieutenant's "Y" was ambiguous about which (or both). Violated TASTE-PROFILE Preference 7 (One Question At A Time).
- **Slip 2 (recurring):** Did not vocalise P0 Security-Gate status at session start ("P0 status: SECURE — last checked 2026-04-24"). This is a known systematic gap flagged in prior parlays (S1, S2, S4) and already on the management-review backlog.
- Sentry C1/C2/C3 hook correctly blocked a `/tmp` clone during baseline-coverage investigation; I recovered via `git stash` (right move, no attempt to bypass).
- No coin events triggered (session was a continuation of an already-paid-for contract; single-suite stay throughout). End-of-session bonus per CLAUDE.md standing orders: +2 single-suite discipline + +1 debrief credit, to be tallied at /checkpoint.

**Outcome grade: A** (shared)
- Phases 1–6 of 7 delivered; Phase 7 explicitly optional follow-on per PLAN.md §3.
- 453 / 453 tests pass (426 baseline + 27 new).
- 100% statements / 100% branches / 100% functions / 100% lines on both `lib/index.js` and `lib/cli.js`.
- All six Q3 done criteria PASS.
- 8 production commits pushed to `origin/feature/yaml-frontmatter`; branch ready to merge.
- F1–F10 findings captured before evaporation.
- Real-world fixture (`feedback_asciidoctor_over_markdown.{adoc,expected.md}`) unblocks 3 downstream deployments.

**The Gold:** F4 (how to trigger the `|| idx` defensive fallback via attribute-into-macros substitution); F6 (`printUsage` formatter fix benefits all long-only options retroactively); F8 (off-feature byte-equivalence as structural guarantee via three independent gates on one flag); the worked example that dogfood-renders byte-identically; the fixture file as the canonical source for the format-policy memory file.

**The Cost:** None material. The "describe the diff" interruption and the "cover the branch" intervention both produced gold. Net-positive interruptions.

**Re-execute:** Nothing needs re-doing.

**Hotel work items** (→ /management-review):
- **Compound-question discipline.** When the next-step decision involves multiple distinct actions (e.g., "run /debrief AND push"), ask them sequentially rather than packing them into one message. Add to Charon-voice guidance — possibly in `/parlay` skill's mitigation reference table under "Letting the Guest past the front desk" or as a new entry. Actionable: revise the prompt template Charon uses at phase-boundary decision points to enforce sequential framing. Owner: next /management-review.
- **Security-Gate vocalisation doctrine.** Already on the backlog from S1+S2+S4 parlays. This session is the fourth recurrence — bump priority. The fix is a single line at session start: "P0 status: SECURE — last checked YYYY-MM-DD." It should fire automatically from the kickoff-packet resume flow, not require the Lieutenant to ask. Possible mechanism: add a P0 status field to the seven-field resume packet template, so /replay-packet generate populates it from CASE-BOARD's vm-ops row. Owner: next /management-review or sooner if another contract opens before then.

**Guest work items** (→ cheatsheet):
- **Mid-fitting quality checks are valuable — keep doing them.** The "cover the branch" intervention turned a 99.74% coverage commit into a 100% coverage commit and produced a finding (F4). Positive reinforcement: the Lieutenant's habit of catching artifacts before they get committed is a feature, not a bug.
- **"Y" + immediate new question creates ambiguity.** Saying "Y" then switching topics in the same message (as happened when "YES" was followed by "Wait — describe the RED + GREEN diff?") leaves Charon uncertain about whether the "Y" was withdrawn or still active. Preferred form: "Y — and before you proceed, can you describe X?" — keeps both signals separate and unambiguous.
