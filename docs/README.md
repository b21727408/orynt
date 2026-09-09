# Orynt — Product Documentation

Bu repository dokümantasyonu Orynt'ın ilk profesyonel ürün sürümü için source of truth'tur.

## V1 çalışma adı

**V1 — Local Execution Workbench**

Marketing adı değildir; V1'in neyi kanıtlaması gerektiğini anlatan internal addır.

## Ana ürün prensibi

> **Complex automation without loss of control.**

Orynt otomasyonu artırırken kullanıcının execution, evidence, history, cost ve kararlar üzerindeki görünürlüğünü azaltmamalıdır.

## Dokümantasyon yaklaşımı

- Yalnızca V1 ayrıntılı tanımlanır.
- Gelecek fikirleri `ideas.md` içinde park edilir; roadmap taahhüdü değildir.
- `AGENTS.md` coding agents için kısa operating guide'dır; ayrıntılı kararların source of truth'u `docs/` altındadır.
- Aynı kuralı birden fazla yerde yeniden tanımlamamaya çalışırız.
- Implementasyonu erteleyebiliriz; gelecekte pahalı refactor yaratacak architectural seam'leri ertelemeyiz.
- Bir deferred feature ya sonradan güvenle eklenebilir olmalı ya da gereken seam bugün tanımlanmalıdır.

## Dosyalar

```text
AGENTS.md
docs/
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

## Foundation decisions

V1 için temel kararlar:

- Rust + Tokio
- Tauri 2
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Motion
- TanStack Query for backend/runtime state projection
- Zustand for UI/session state
- React Hook Form + Zod for forms
- SQLite via SQLx
- modular monolith
- Cargo workspace
- crates: `core`, `orchestration`, `application`, `storage`, `runtime`, `connectors`
- pnpm
- Vitest + React Testing Library + Playwright
- standard quality tooling over a custom quality framework
- Orynt-specific correctness enforced with normal tests, scenario tests and later golden-run/eval regression

## Product thesis

Orynt:

- kullanıcının kendi bilgisayarında çalışır,
- birden fazla project ve work source ile aynı anda çalışabilir,
- işleri triage eder,
- bounded execution plan oluşturur,
- local/cloud modelleri policy ve gözlemlenmiş performansa göre route edebilir,
- execution'ın her aşamasını görünür kılar,
- arbitrary-stage feedback / rerun / rewind sağlar,
- deterministic verification ile independent AI review'u ayırır,
- kararları, evidence'ı, cost'u ve history'yi korur,
- zamanla triage/model/orchestration performansını ölçebilecek explainable experience data üretir.
