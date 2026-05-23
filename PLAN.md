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
