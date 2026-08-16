---
name: explore-research
description: Investigate the codebase and return a grounded verdict — use when the user asks to analyze how or why code works, explore or compare approaches, verify a claim against the code, or answer any question that requires reading code. Read-only: produces answers, never code.
---

The deliverable is a **verdict**, not an edit. Every answer is **grounded** in code evidence — a claim without a `file:line` citation is speculation. This skill is read-only: it analyzes and answers, and never writes code.

An answer is grounded when two loops close: the **hypothesis loop** (first principles → falsifiable claims) and the **evidence loop** (code research → confirmation or refutation). Both must close before you answer.

## Step 1 — Frame from first principles

Restate the question in one sentence, in the plainest terms. Then derive what must be true for any correct answer — the invariants, the constraints, the likely mechanism — before reading any code. Turn each candidate into a **hypothesis**: a falsifiable claim about the code ("X is the single source of truth for Y", "Z is only reached from the auth path").

**Completion**: the question restated in one sentence, and every candidate hypothesis listed as a falsifiable claim — derived from the question alone, not from the code.

## Step 2 — Close the evidence loop

Test every hypothesis. Prefer structural tools first — symbol definitions, callers, outlines, then targeted grep and reads; read the code, not just search hits. Vary the technique when evidence is thin:

| Technique             | When                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Follow the data flow  | Trace a value: definition → callers → callees, hop by hop                                     |
| Compare with the docs | ADRs, `.working-docs/`, `CONTEXT.md`, package `docs/` — spot the drift                        |
| Check the git history | `git log` / `git blame` on a suspicious file — intent lives in the diff                       |
| Read the names        | Follow repo conventions (module shape, unit vs module, `#/*` aliases) — violations flag seams |

Record every finding as evidence with a `file:line` citation. Refute as readily as confirm: one counter-example kills a hypothesis.

**Completion**: every hypothesis confirmed or refuted, each finding cited; no hypothesis left untested, no claim resting on uncited recollection.

## Step 3 — Deliver the verdict

State the answer directly, supported by the strongest evidence, and say plainly what remains uncertain. Cite the code in the answer (`path:line`). Where the code and the docs disagree, the code wins — say so. Do not edit anything.

**Completion**: the question answered, every claim cited, uncertainty stated, and the workspace left unchanged.
