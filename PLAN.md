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

(empty — first session entries land at end of feature-work sessions)
