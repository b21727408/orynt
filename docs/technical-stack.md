# Technical Stack

Bu dosya V1 foundation için seçilmiş teknoloji stack'ini tanımlar. Amaç mümkün olduğunca sıkıcı, güçlü, gözlemlenebilir ve değiştirilebilir teknolojiler kullanmaktır.

## 1. Core language and runtime

### Rust

Primary language for application core.

Use for:

- domain and application logic
- orchestration
- async runtime work
- process/tool execution
- filesystem and Git operations
- persistence adapters
- connectors
- security-sensitive logic
- Tauri backend

### Tokio

Async runtime.

Long-running work, cancellation, process execution, model calls, streaming and background tasks Tokio üzerinde kurulacaktır.

### Error and observability

- `thiserror` for typed library/domain errors where useful
- `anyhow` at application/composition boundaries where contextual propagation is more useful than a public typed API
- `tracing`
- `tracing-subscriber`

Errors silently success/default state'e dönüştürülmemelidir.

## 2. Desktop shell

### Tauri 2

Responsibilities:

- desktop packaging
- Rust ↔ frontend IPC
- native window integration
- permission/capability boundary
- distribution

Tauri thin shell'dur. Domain, orchestration ve application logic `src-tauri` handler'larında yaşamamalıdır.

## 3. Frontend

### Base

- React
- TypeScript
- Vite
- pnpm

### UI

- Tailwind CSS
- shadcn/ui
- Motion (`motion/react`)

### Navigation and data

- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod

State ownership:

```text
Rust runtime + SQLite
    canonical application state
        │
        ▼
TanStack Query
    backend/runtime projection + cache
        │
        ├── Tauri commands
        └── runtime events update/invalidate cache

Zustand
    UI/session/workspace state

React local state
    truly component-local ephemeral state
```

Do not mirror the whole backend database or Run graph inside Zustand.

Typical Zustand state:

- selected WorkItem / Run / Stage
- inspector target/open state
- UI filters
- sidebar/panel state
- command palette state
- local layout/session preferences

Typical TanStack Query state:

- WorkItems
- Runs
- execution history
- Model Registry
- Policies
- Projects / Repositories
- Decisions / Artifacts
- persisted settings

Forms use React Hook Form; Zod gives frontend validation/schema ergonomics. Rust remains the trust boundary and validates again.

## 4. Future visual layers

Not scaffold dependencies.

### React Flow

Later, for graph/workflow visualization.

### PixiJS

Later, for the Virtual Office / live operations floor renderer.

### Rive

Later, for state-driven vector/character animation.

These are replaceable presentation layers over canonical runtime state.

## 5. Persistence

### SQLite

V1 local persistence.

### SQLx

Chosen SQLite access layer.

Reasons:

- async-friendly
- explicit SQL
- migrations
- compile-time/query validation options where practical
- no large ORM domain model leaking into the core

Persistence structs are adapters, not canonical domain models.

## 6. Serialization and HTTP

- `serde`
- `serde_json`
- `reqwest`

Provider/vendor-specific transport DTOs must remain at adapter boundaries.

## 7. Git

V1 uses the installed `git` CLI behind a typed process/workspace wrapper.

Reasons:

- behavior matches developer environments
- avoids prematurely reproducing Git behavior in-process
- easier to inspect and debug

No raw shell-string concatenation. Commands use structured argv and explicit working directories.

## 8. Credentials

Use OS-native secure credential storage. Evaluate/use the Rust `keyring` ecosystem at scaffold/runtime implementation time.

Secrets must not be persisted as plaintext in SQLite or logs.

## 9. Model providers

V1 begins with OpenAI-compatible HTTP providers and supports both local and cloud endpoints.

Internal abstractions must not encode one vendor as the domain model.

Model metadata includes:

- provider
- endpoint
- local/cloud execution location
- capabilities
- context window
- tool/vision support where relevant
- price metadata
- health
- trust/data-boundary metadata

MCP may be supported as an external integration protocol later. It is not Orynt's internal architecture.

## 10. Testing and quality tooling

### Rust

- `rustfmt`
- Clippy with warnings denied in CI
- `cargo-nextest`
- `cargo-deny`
- `cargo-machete`

Early V1:

- `cargo-llvm-cov` for measurement first, not an arbitrary high coverage gate

Later for critical logic:

- `cargo-mutants`

### Frontend

- TypeScript strict mode
- ESLint
- Prettier
- Vitest
- React Testing Library
- Knip

With the first real user flow:

- Playwright

Detailed policy is in `v1/quality.md`.

## 11. Safe Rust policy

Application-owned Rust is safe by default.

`core`, `orchestration` and `application` should forbid unsafe code. The default goal is to forbid unsafe code in all Orynt-owned crates.

If a future native/FFI requirement truly needs unsafe, isolate it behind a small dedicated boundary and require explicit review and documentation. Do not spread unsafe through existing domain/runtime code.

## 12. Repository principles

- modular monolith first
- no premature microservices
- no custom generic quality framework
- no custom generic architecture DSL/checker at scaffold time
- no speculative provider abstractions without a current seam requirement
- no premature 3D/virtual office dependency
- prefer standard, battle-tested tools
- keep external libraries replaceable behind narrow interfaces when the boundary is real
