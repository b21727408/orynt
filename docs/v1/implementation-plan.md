# V1 Implementation Plan

The goal is not to consume a feature list. Every milestone must leave Orynt demonstrably more real.

Each milestone should end with:

- a working demo
- relevant tests
- migrations if persistence changed
- a visible UI state where applicable
- an error path
- documentation updated only when a decision changed

## Milestone 0 — Foundation Scaffold

Implement:

- Cargo workspace
- crates: core, orchestration, application, storage, runtime, connectors
- Tauri 2 desktop shell
- React + TypeScript + Vite
- Tailwind + shadcn/ui foundation
- React Router
- TanStack Query
- Zustand
- React Hook Form + Zod
- SQLite + SQLx migration infrastructure
- tracing
- typed Tauri request/response proof
- quality tooling from `quality.md`
- CI
- repository docs + `AGENTS.md`

Do **not** implement:

- Jira
- Git
- models
- MasterMind
- Triage
- policies
- fake future ports/modules

Demo:

```text
desktop starts
→ frontend loads
→ typed IPC health call reaches Rust
→ SQLite migration initializes
→ quality/test commands pass
```

## Milestone 1 — Work / Run / Stage Backbone

Implement:

- canonical IDs
- WorkItem
- Run
- StageKind
- StageExecution
- ExecutionPlan revision foundation
- typed Event
- persistence
- application use cases
- Overview shell
- Work master-detail UI
- one-click stage navigation
- optional Inspector shell
- fake asynchronous stage execution
- restart persistence

Quality additions:

- Playwright for the first critical user flow
- cargo-llvm-cov measurement
- meaningful SQLite/application integration tests

No AI.

Demo:

```text
Create Work
→ Start Fake Run
→ stages progress
→ click any stage and inspect result
→ restart application
→ current state and historical executions remain
```

This milestone validates the most expensive foundations.

## Milestone 2 — Runtime & Model Registry

Implement:

- ModelProvider port when needed
- OpenAI-compatible provider implementation
- local/cloud ModelProfile
- model health
- timeouts/cancellation
- ModelCall persistence
- token/cost/latency telemetry
- model settings UI
- secure credential storage

Demo:

```text
Analysis
→ route to chosen local/cloud model
→ structured result
→ model call and usage visible
```

## Milestone 3 — Execution Plan & Triage

Implement:

- TriageAssessment
- ExecutionPlanner
- variable worker counts
- bounded stage selection
- triage evidence/confidence
- initial model strategy hints
- plan preview/detail
- predicted plan observations

Begin plain scenario fixtures/tests.

Demo:

two materially different WorkItems produce materially different bounded plans.

## Milestone 4 — Rewind / Rerun / Feedback

Implement:

- stage attempts/revisions
- Re-run This Stage
- Re-run From Here
- explicit downstream invalidation
- user feedback
- Change Model & Re-run
- decision/event records
- preserved old results

Demo:

```text
Analysis complete
→ Implementation complete
→ user reruns from Analysis
→ previous downstream history remains inspectable
→ new downstream execution is created
```

This is a core V1 product differentiator.

## Milestone 5 — Project / Repository / Git Runtime

Implement:

- Project
- Repository
- LocalWorkspace
- source→project→repo→workspace context resolution
- typed process runner
- Git CLI wrapper
- safe branch/worktree strategy
- diff artifacts
- repository settings UI

Demo:

multiple Projects resolve to the correct local workspaces without changing the app's global navigation context.

## Milestone 6 — Jira WorkSource

Introduce the WorkSource port because the real adapter now exists.

Implement:

- Jira adapter
- polling/event discovery mechanism
- external reference mapping
- Jira → canonical WorkItem
- required read/write-back capabilities
- connection health

Demo:

WorkItems from multiple Jira projects appear in one global Work list.

## Milestone 7 — Verification

Introduce VerificationRunner where needed.

Implement structured checks:

- build
- test
- lint
- typecheck
- static analysis hooks
- custom deterministic command checks

Persist:

- VerificationResult
- findings
- raw output artifact
- duration/status

Verification remains distinct from AI Review.

## Milestone 8 — Independent Review & Review Workspace

Implement:

- independent reviewers
- reviewer isolation from implementer reasoning history by default
- structured findings
- review iteration
- summary/evidence-first Review Workspace
- Changes / Verification / Review / Policies / Raw Diff views

Human merge remains the boundary.

## Milestone 9 — Policies

Implement a small useful library plus custom policies:

- Deterministic
- Semantic Review
- Workflow

Add:

- search
- one-click enable/disable
- scope
- severity/enforcement
- effective policy resolution required for V1

Do not build a giant marketplace or general policy programming language.

## Milestone 10 — Experience Memory & Adaptive Routing

Persist normalized observations:

- model
- stage
- work type/class
- risk where useful
- success
- duration
- cost/tokens
- intervention/rewind
- verification/review outcomes

Routing can use a transparent scoring/rule model.

Every adaptive route remains explainable.

## Milestone 11 — MasterMind

Implement bounded supervisor:

- Observe / Suggest / Act
- state observation
- decision proposal
- Guard
- Action Plane integration
- intervention budgets
- model swap/rerun/pause/resume where policy permits
- Decision Journal

No hidden root path around the shared action/policy boundary.

## Milestone 12 — Triage Calibration Foundation

Connect:

```text
triage prediction
→ actual execution shape
→ outcome
→ interventions/rewinds
→ cost/time
```

Provide basic calibration analysis.

No autonomous opaque self-training.

## Milestone 13 — GitHub CodeHost / PR Flow

Introduce/use CodeHost port.

Implement:

- GitHub adapter
- PR creation
- PR metadata/status
- evidence/review summary attachment where appropriate

No auto merge in V1.

## Milestone 14 — Product Hardening

Focus on:

- crash/restart recovery
- migration robustness
- cancellation
- error states
- accessibility
- keyboard/deep-link consistency
- performance
- observability
- packaging
- update strategy
- permission/security review
- critical E2E coverage
- dependency/license review
- documentation drift review

## Company Hub

Do not make Company Hub a blocker for the local product.

During V1, preserve the architectural seam and avoid local-only assumptions.

A minimal protocol/client/dev hub is considered only after the standalone node is healthy and there is a concrete enterprise workflow to validate.

## First development week

Keep it deliberately small:

```text
Tauri + React
SQLite migration
WorkItem
Run
StageExecution
typed Events
master-detail Work UI
fake execution
restart persistence
```

Do not begin with AI, Jira, Git, MasterMind or Policy Engine.

The goal is to prove the foundation before expensive intelligence is layered on top.
