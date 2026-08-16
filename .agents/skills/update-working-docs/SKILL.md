# Skill: update-working-docs

**update-working-docs** keeps the repo's domain-doc surface — `.working-docs/`, `CONTEXT.md`, `CODING_CONVENTIONS.md` — **true** and **tight**: true to the code, tight in prose. Two passes, in order: Pass 1 models the current state via the `/domain-modeling` skill; Pass 2 compresses every file Pass 1 wrote via the `/caveman-compress` skill. Run it when domain modeling work lands — a SOW phase completes, an ADR is written, a module surface changes, glossary terms shift.

## Pass 1 — Model (via `/domain-modeling`)

Load `/domain-modeling` and run its process, mapping its generic targets onto this repo:

| domain-modeling's target   | this repo's home                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| root `CONTEXT.md` glossary | `CONTEXT.md`                                                                                                               |
| `docs/adr/`                | `.working-docs/adr/`                                                                                                       |
| per-context docs           | `.working-docs/DOMAIN_MODEL.md`, `.working-docs/BOUNDED_CONTEXTS.md`, `domain-model/<pkg>.md`, `bounded-contexts/<pkg>.md` |

Scope the pass from the work at hand (`git status` / `git diff` + this session's changes) — touch only what the work touches. Direct each change to exactly one home:

- **Terms & decisions** → `CONTEXT.md` glossary, per-package domain docs, ADRs (`.working-docs/adr/`) — follow `/domain-modeling`'s CONTEXT-FORMAT / ADR-FORMAT.
- **Code facts** → `CODING_CONVENTIONS.md` (workspace state, table/workflow/event/ACL inventories) and `.working-docs/sow/<name>.md` status + `.working-docs/todo/` + `TODO.md` when phases land.

Cross-reference code by grep, not memory. Capture as you go — don't batch (domain-modeling's inline discipline).

**Completion — the record is true**: every term, decision, and code fact that changed with the work sits in exactly one home above, grep-verified; nothing new waits in the conversation; untouched files are untouched.

## Pass 2 — Compress (via `/caveman-compress`)

Keep the list of files Pass 1 wrote or edited. Run `/caveman-compress` on each absolute path — it overwrites the file with the caveman-compressed version and keeps the readable original in its out-of-tree backup dir. Never compress a file Pass 1 didn't touch.

**Completion — the record is tight**: every touched file is caveman-compressed (spot-check the head of each) and every readable original is backed up out-of-tree.

## Report

List the files updated and compressed.
