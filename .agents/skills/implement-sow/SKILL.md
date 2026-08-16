# Skill: implement-sow

A **Scope of Work (SOW)** in `.working-docs/sow/<name>.md` is the design record for a chunk of platform work; this skill **executes it one phase at a time** — each phase gated before the next begins. It pairs with the `write-sow` skill (which wrote the SOW) and drives the `write-module` and `write-docs` skills from the SOW's own phases. The SOW is the single source of truth for **what** to build and **when** it's done; this skill owns **how** the phases run.

Every phase ends on a **gate** — the compile/lint/build checks the SOW names. A gate is binary: **green** or red; the next phase does not start until the current gate is green. The SOW's **status** — the Status line and the ✅/⏳ markers — is the ground truth for where the work stands: it names the start phase and where completion is recorded. The sweep **greps** a phase names must come back **clean** before the phase that introduced the names can be trusted.

## Step 1 — Orient

Read the SOW end to end before touching code — Confirmed Decisions, §1 inventory + baseline, §2 target model, every phase and its gate, Open Decisions (execute the recommended default unless told otherwise), Deployment Notes, acceptance criteria — plus the domain docs it names (`domain-model/`, `bounded-contexts/`, `CONTEXT.md`). Then read the **status** to find the start phase: the first phase not marked done (✅/strike-through/`Complete`). Check prerequisites: `bun install` current; every build-step package the work imports has `.output/` built (rebuild touched ones with `cd packages/<pkg> && bun run build` before typechecking downstream — tsc resolves through `.output/`); re-run the §1 baseline greps — still **clean**.

**Completion**: you can name the start phase, every gate, and the acceptance criteria; prerequisites are green; the baseline is clean.

## Step 2 — Run the phases

Walk the phases in order. For each:

1. **Execute** the phase's numbered steps exactly as written — the SOW's Out of Scope list is binding, so nothing beyond them. Load the `write-module` skill when a step scaffolds a package; load the `write-docs` skill for the docs phase.
2. **Gate** it: run every check the phase names — package `check:lint` + `check:types` + `build`; root `check:lint` + `check:types` at integration phases; the docs build in the final phase. A red gate is a failure in the phase, not permission to advance: fix it. A red gate in a package the phase never touched is pre-existing (root-composite failures in untouched packages are known) — confirm by checking whether the touched package's own errors appear. Rebuild any touched build-step package before typechecking downstream of it.
3. **Record the status**: mark the phase done in the SOW — the Status line lists it, Confirmed Decisions rows gain `✅ Done`, the phase heading gains a done note. `bun run build` rewrites the package's `package.json` in place (exports → `.output/`); commit or discard that deliberately, never the `.output/` itself.

**Completion**: every phase up to the final one is executed, gated green, and recorded in the SOW's status.

## Step 3 — Verify the acceptance criteria

The final phase's completion criterion is the SOW's: the sweep **greps** return **clean** (every table, topic, accessor, and leftover term the SOW lists matches nothing); the acceptance criteria hold (modules compile/lint/build, no leftovers, docs describe the new model); root `check:lint` + `check:types` green. Then update the SOW's Status line to `Complete` with the phases done.

**Completion**: sweeps clean, acceptance criteria hold, the SOW reads `Complete`.

## Step 4 — Report

Report what ran and what remains: the phases executed with each gate's result; the surface changed (packages, tables, workflow groups); the Open Decisions you executed at their recommended defaults; and the **Deployment Notes** still owed to the host app — `DROP TABLE`s after data mapping (`pushSchema` never drops), new subscriptions for produced-only topics (pg-boss silently drops unsubscribed topics), any legacy-surface removals.

**Completion**: the report names every phase + gate result, the changed surface, the executed defaults, and each outstanding host-app obligation.
