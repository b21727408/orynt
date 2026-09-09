# V1 Architecture

## 1. Architectural goals

V1 must support, or deliberately preserve a seam for:

- local-first execution
- multi-project global work
- vendor-neutral work/code/model integrations
- local + cloud model routing
- stage-level policy enforcement
- dynamic but bounded execution plans
- arbitrary-stage rerun/rewind
- preserved historical executions
- structured events, decisions and evidence
- explainable performance/experience telemetry
- future Company Hub connectivity without requiring a server for local use
- UI-independent reusable Rust core
- explicit human control

The architecture is a **modular monolith**.

No microservices, distributed workers, general workflow engine, or self-modifying prompt system in V1.

## 2. Cargo workspace

```text
                         core
                          ▲
                          │
                    orchestration
                          ▲
                          │
                     application
                   ▲      ▲      ▲
                   │      │      │
                storage runtime connectors
                   ▲      ▲      ▲
                   └──────┼──────┘
                          │
                    desktop/Tauri
                   composition root
```

Dependency meaning: arrows point toward the dependency.

### `core`

Canonical domain types and invariants.

Must not depend on:

- Tauri
- SQLx
- reqwest
- Jira/GitHub SDK concepts
- desktop UI
- vendor-specific API DTOs

Examples over V1:

- IDs
- WorkItem
- Run
- StageKind / StageExecution
- ExecutionPlan types
- Event / Decision
- Model/Policy domain values
- findings/artifacts

No I/O ownership.

### `orchestration`

Pure/deterministic decision logic as far as practical.

Examples:

- triage interpretation
- execution planning
- routing scoring/selection
- policy evaluation logic
- MasterMind evaluation/decision proposal
- guard logic

Depends on `core`.

It should receive explicit inputs and return explicit decisions/plans rather than reaching into SQLite, Jira or HTTP itself.

### `application`

Use cases and system coordination.

Examples:

- create work
- start/pause/stop run
- rerun stage
- rerun from stage
- apply feedback
- resolve context
- invoke orchestration
- persist results through ports
- publish runtime-visible state/events

Application-layer ports/traits are introduced when the real capability appears.

Examples over V1:

- repositories
- WorkSource
- CodeHost
- ModelProvider
- ToolExecutor
- VerificationRunner
- SecretStore

Do not create all future ports on day one.

### `storage`

SQLite implementation via SQLx.

Implements application repository ports.

Owns:

- migrations
- SQL
- persistence records
- transaction mechanics

Persistence structs do not become domain structs by convenience.

### `runtime`

Execution infrastructure.

Examples:

- model HTTP calls
- process runner
- cancellation/timeouts
- workspace operations
- Git CLI wrapper
- verification execution
- model health probes
- event plumbing required by runtime execution

Implements relevant application ports.

### `connectors`

External product adapters.

V1:

- Jira WorkSource adapter
- GitHub CodeHost adapter

Future providers should normally begin as modules inside this crate. Split into separate crates only when compile-time, ownership, dependency, or release pressure proves that necessary.

### `apps/desktop/src-tauri`

Composition root and thin Tauri transport layer.

Responsibilities:

- instantiate concrete adapters/services
- wire dependencies
- expose commands/events/channels
- desktop permissions

Tauri commands should be boring transport code.

## 3. Frontend state architecture

```text
Rust Runtime / Application / SQLite
            │
            │ canonical state
            ▼
       Tauri IPC + Events
            │
    ┌───────┴────────┐
    │                │
TanStack Query     Zustand
backend/runtime    UI/session
projection         state
    │                │
    └───────┬────────┘
            ▼
          React
```

Rules:

- backend/runtime state is not duplicated wholesale into Zustand
- live events update/invalidate TanStack Query data
- Zustand owns interaction/workspace state
- component-only ephemeral state stays local
- URL/router state is used for deep-linkable navigation where appropriate

This division prevents frontend state from becoming a second application database.

## 4. Core execution model

```text
WorkItem
│
├── SourceReference
├── ContextReferences
├── EffectivePolicySet
│
└── Run[]
    │
    ├── ExecutionPlanRevision[]
    │   └── StagePlan[]
    │
    ├── StageExecution[]
    │   ├── WorkerExecution[]
    │   ├── ModelCall[]
    │   ├── ToolCall[]
    │   ├── Finding[]
    │   └── Artifact[]
    │
    ├── Decision[]
    ├── Event[]
    └── Outcome
```

Internal IDs are Orynt IDs. Provider IDs are external references.

A Jira key such as `PAY-1842` never becomes the canonical WorkItem ID.

## 5. History semantics

History is a product feature, not logging residue.

- rerunning a Stage never erases the previous execution
- rerunning from an upstream Stage invalidates current downstream results but preserves them as historical results
- completed execution evidence remains inspectable
- plan changes create revisions rather than rewriting what the user previously saw
- Event and Decision Journal records are append-oriented audit data
- Run may have mutable current status, but prior attempts/revisions remain available

This foundation makes later replay, comparison and golden-run regression possible without implementing those features in V1.

## 6. Execution plan

Execution plans are bounded and versioned.

Example:

```text
Revision 1

Triage
  ↓
Analysis ×2
  ↓
Implementation ×1
  ↓
Verification
  ↓
Review ×3
  ↓
Outcome
```

A user/MasterMind rewind may lead to:

```text
Revision 2

Analysis ×3
  ↓
Implementation ×1
  ↓
Verification
  ↓
Review ×2
```

The old revision remains inspectable.

Supported V1 stage kinds:

- Triage
- Context
- Analysis
- Planning
- Implementation
- Verification
- Review
- Outcome

Stage kinds are bounded. V1 is not a general arbitrary workflow programming platform.

## 7. Triage

Triage emits a structured hypothesis, not unquestionable truth.

```text
TriageAssessment
- work_type
- risk
- complexity
- ambiguity
- context_completeness
- recommended_stages
- worker_counts
- reviewer_roles/composition
- model_strategy
- verification_profile
- estimated_cost_class
- confidence
- evidence
```

`ExecutionPlanner` combines:

- TriageAssessment
- effective policies
- model availability
- routing constraints
- Experience Memory observations

to produce an ExecutionPlan.

V1 records predicted plan properties and actual outcomes so future calibration is possible. No opaque self-training or self-modifying prompts in V1.

## 8. MasterMind

MasterMind is a bounded supervisor, not a worker and not root access.

```text
Observe
  ↓
Evaluate
  ↓
Propose Action
  ↓
Policy / Guard
  ↓
Action Plane
  ↓
Event + Decision Journal
```

Modes:

- Observe
- Suggest
- Act

Hard principles:

- policy deny wins
- cloud deny can never be bypassed
- explicit human decisions are not silently overridden
- active successful work is not gratuitously disturbed
- intervention/retry budgets exist
- repeated actions are bounded
- every meaningful intervention is explainable and journaled

The product exposes structured reason/evidence, not private chain-of-thought.

## 9. Action Plane

Human UI and MasterMind must not have separate execution paths.

```text
Human UI ───────┐
                │
MasterMind ─────┼──> Action Plane ──> Application/Runtime
                │
Future Rules ───┘
```

Action examples:

- start_run
- pause_run
- stop_run
- rerun_stage
- rerun_from_stage
- change_model
- apply_feedback
- update_execution_plan
- run_verification
- create_pull_request

Authorization/policy/guard checks occur at the shared action boundary.

## 10. Model Registry and routing

A model is a resource, not a string.

```text
ModelProfile
- id
- provider
- model_name
- execution_location: local | cloud
- endpoint
- capabilities
- context_window
- tool_support
- vision_support
- pricing
- trust/data_boundary
- health
```

Stage model policy can constrain:

- local/cloud allowed
- approved/denied model IDs
- max estimated cost
- optimization goal
- fallback strategy

Routing inputs may include:

- stage
- work type
- risk
- policy compatibility
- availability
- historical success
- cost
- latency
- local/cloud preference

A route returns selected model plus a concise reason, alternatives and policy checks. Historical routing observations are recorded.

## 11. Experience Memory

V1 Experience Memory is explainable telemetry, not mystical memory.

Capture normalized observations such as:

- model
- stage
- work class
- attempt
- success/failure
- duration
- tokens
- estimated API cost
- intervention count
- rewind count
- verification result
- review result

Triage observations connect predictions to actual execution shape/outcome.

This data is the seam for later adaptive routing and triage calibration.

## 12. Policies

Policy classes:

### Deterministic Policy

Objectively evaluated by code/tool result.

### Semantic Review Policy

Requires independent semantic review.

### Workflow Policy

Constrains execution shape/order/required stages.

Policies are first-class and explainable. V1 starts with a small useful library plus custom policies, not a marketplace.

The architecture must permit future organization/project/repository inheritance, but a large inheritance engine is not implemented before needed.

## 13. Verification vs Review

They are separate layers.

### Verification

Objective checks:

- build
- test
- lint
- typecheck
- static analysis
- custom deterministic checks

### Review

Independent judgment:

- semantic correctness
- architectural risk
- policy concerns
- maintainability
- remaining uncertainty

Reviewers should normally not receive the implementer's private reasoning history; they receive the issue/context, their own analysis context, change/evidence and required artifacts.

## 14. WorkSource and CodeHost

Vendor names stay in adapters.

Conceptual capabilities:

```text
WorkSource
- discover/read work
- read/update external state where allowed

CodeHost
- read repository/PR metadata
- create/update pull request where allowed
```

Jira and GitHub are V1 adapters, not core entities.

Future Notion/Linear/ServiceNow should not require rewriting the domain model.

## 15. Project context resolution

Project is a context/configuration scope, not navigation root.

Conceptually:

```text
Source reference
    ↓
Project
    ↓
Repository
    ↓
LocalWorkspace
    ↓
effective config/policies/models/knowledge
```

The Work UI remains global across projects.

## 16. Company Hub seam

V1 local node must work standalone.

Do not build a server merely because one may exist later.

Do not hard-code assumptions that policies, model registry configuration, or experience information can only ever be local.

Future Company Hub may supply/merge:

- organization policy
- approved model registry
- shared configuration
- aggregate model performance
- organizational memory

Raw repository content and execution context are not centralized by default.

The seam is architectural now; the server/client implementation is deferred until a real V1/enterprise need justifies it.

## 17. Event model

Prefer typed structured events.

Examples:

```text
work.discovered
run.created
run.started
stage.started
stage.completed
model.call.started
model.call.completed
tool.call.started
tool.call.completed
finding.created
decision.recorded
run.rewound
run.failed
run.completed
```

The default UI shows structured activity rather than raw terminal spam. Raw data remains inspectable.

## 18. Security minimum

- OS-native secret storage
- explicit local/cloud model boundary
- stage-level cloud deny
- process/tool capability boundaries
- destructive action guard
- explicit working directory for processes
- no shell-string concatenation for command execution
- secret redaction from logs/events
- safe Rust by default
- human merge remains default; no V1 auto-merge

## 19. Deferred-feature rule

For every deferred feature choose one:

### A. No architectural dependency

Safely add later.

Examples:

- React Flow
- PixiJS
- Rive
- mutation testing engine

### B. Architectural seam required now

Define the seam/data now, defer implementation.

Examples:

- future WorkSources → vendor-neutral WorkSource boundary
- model adaptation → telemetry now
- triage calibration → prediction/outcome observations now
- replay/golden runs → preserved structured execution history now
- Company Hub → local/organization configuration boundary now

> Implementations may be deferred. Expensive future refactors should not be created accidentally.


## 20. Repository decision governance

Architecture/product/security decisions in `docs/` are authoritative inputs to implementation.

Repository coding agents are not allowed to edit documentation to resolve implementation friction.

If a task requires a lasting decision not covered by the documents, implementation pauses and the user decides before code proceeds.

Security trust boundaries are defined in `security.md`.

Branch/commit/PR rules are defined in `development-workflow.md`.
