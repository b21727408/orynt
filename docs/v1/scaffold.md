# V1 Scaffold

This is the agreed repository shape for Orynt V1.

It is a target structure, not an instruction to generate empty folders or placeholder modules.

## 1. Repository

```text
orynt/
├── AGENTS.md
├── Cargo.toml
├── Cargo.lock
├── rust-toolchain.toml
├── deny.toml
├── package.json                 # optional root scripts only if useful
├── pnpm-workspace.yaml
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── crates/
│   ├── core/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   │
│   ├── orchestration/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   │
│   ├── application/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   │
│   ├── storage/
│   │   ├── Cargo.toml
│   │   ├── migrations/
│   │   └── src/
│   │       └── lib.rs
│   │
│   ├── runtime/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   │
│   └── connectors/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
│
├── apps/
│   └── desktop/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── features/
│       │   ├── lib/
│       │   └── main.tsx
│       └── src-tauri/
│           ├── Cargo.toml
│           ├── tauri.conf.json
│           ├── capabilities/
│           └── src/
│               ├── lib.rs
│               └── main.rs
│
└── docs/
    ├── README.md
    ├── technical-stack.md
    ├── ideas.md
    └── v1/
        ├── scope.md
        ├── terminology.md
        ├── architecture.md
        ├── ux.md
        ├── scaffold.md
        ├── quality.md
        └── implementation-plan.md
```

Do not create directories merely because they appear in the target tree. A folder/module should have a real current consumer.

## 2. Crate responsibilities

### `core`

Domain vocabulary and invariants.

No:

- Tauri
- SQLx
- reqwest
- provider DTOs
- filesystem/network/process behavior

### `orchestration`

Planning and bounded decision logic.

Starts small and later gains cohesive modules such as:

```text
triage/
planning/
routing/
mastermind/
guard/
policy/
```

Only create a module when its implementation exists. Do not pre-create this tree.

### `application`

Use cases and ports.

This crate prevents:

- Tauri handlers from owning business logic
- runtime/storage/connectors from calling each other ad hoc
- provider concepts from leaking into domain code

Ports are introduced with features, not speculatively.

### `storage`

SQLx + SQLite implementation.

### `runtime`

Model/process/tool/Git/verification infrastructure.

### `connectors`

Jira/GitHub adapters initially. Additional providers begin as cohesive modules here and may split later if there is a proven reason.

### desktop `src-tauri`

Composition root + IPC only.

## 3. Dependency direction

```text
core
↑
orchestration
↑
application
↑       ↑       ↑
storage runtime connectors
 \       |       /
   desktop/Tauri
```

More precisely:

- `orchestration -> core`
- `application -> core + orchestration`
- `storage -> core + application`
- `runtime -> core + application`
- `connectors -> core + application`
- desktop composition root -> all concrete crates it wires

Avoid circular dependencies.

## 4. Frontend structure

Use feature-first organization, but do not generate empty route/feature folders.

As screens arrive, target:

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── shell/
│
├── features/
│   ├── overview/
│   ├── work/
│   ├── runs/
│   ├── mastermind/
│   ├── resources/
│   ├── integrations/
│   └── settings/
│
├── components/
│   └── shared application UI
│
├── lib/
│   ├── ipc/
│   ├── query/
│   └── utilities with a concrete cohesive purpose
│
└── main.tsx
```

Avoid catch-all `utils.ts`, `helpers.ts`, `services.ts` dumping grounds.

Feature-specific components/hooks/state stay with their feature.

## 5. Frontend state

### TanStack Query

Canonical backend/runtime projection.

### Zustand

UI/session state.

A small number of cohesive stores is preferred over one global mega-store or dozens of tiny stores.

Possible early workspace store:

```text
selectedWorkItemId
selectedRunId
selectedStageId
inspectorTarget
inspectorOpen
workFilters
sidebarCollapsed
commandPaletteOpen
```

Do not persist everything automatically. Persist only preferences that genuinely survive a restart.

### React local state

Use for state that does not need to leave one component/subtree.

### React Hook Form + Zod

Forms and client-side validation.

## 6. Module policy

We use modules. We do not create module bureaucracy.

Create a module when at least one is true:

- it owns a coherent domain concept
- it hides an implementation detail behind a useful public boundary
- the current file is becoming hard to understand because multiple responsibilities are mixed
- tests/ownership become meaningfully clearer

Do not create a module because:

- a future feature may need it
- a diagram has a box for it
- an AI prefers one type per directory
- a generic `manager`, `factory`, `service`, `helper`, `common`, or `utils` name feels architectural

Prefer semantic names from `terminology.md`.

## 7. Initial vertical slice

After scaffold, the first product slice is:

```text
Manual WorkItem
→ SQLite
→ Run
→ a few fake StageExecutions
→ typed Events
→ Work master/detail UI
→ click Stage and inspect result
→ restart app
→ same history
```

No AI is required for this slice.

It validates the most expensive foundations:

- domain/history model
- persistence
- typed IPC
- UI mental model
- restart behavior

## 8. Quality in the scaffold

Scaffold includes:

### Rust

- rustfmt
- Clippy with warnings denied in CI
- cargo-nextest
- cargo-deny
- cargo-machete

### Frontend

- strict TypeScript
- ESLint
- Prettier
- Vitest
- React Testing Library
- Knip

### CI

Keep it understandable.

A small set of jobs is preferred, conceptually:

```text
quality
test
security/dependencies
```

Do not build an internal CI framework.

## 9. Quality introduced with Milestone 1

When the first real vertical slice exists:

- Playwright
- cargo-llvm-cov
- first meaningful cross-layer/integration tests

Coverage is measured before a repository-wide percentage gate is considered.

## 10. Orchestration testing seam

When orchestration begins, scenario fixtures should be ordinary tests, not a new framework.

Example target:

```text
crates/orchestration/
└── tests/
    └── scenarios/
        ├── fixtures/
        └── triage.rs
```

JSON/structured fixtures + Rust tests are enough until proven otherwise.

## 11. Toolchain reproducibility

- commit `Cargo.lock`
- commit pnpm lockfile
- pin a tested Rust stable toolchain in `rust-toolchain.toml`
- CI and developer commands should use the same documented toolchain
- do not use floating dependency versions in production code

The exact tested versions are chosen when scaffold is generated, not guessed in this document.
