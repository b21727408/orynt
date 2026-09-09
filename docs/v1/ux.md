# V1 UX

## 1. UX Principle

> **Complex automation without loss of control.**

Orynt çok iş yaptığı için kullanıcıyı execution'dan uzaklaştırmamalıdır.

Kullanıcı:

- ne olduğunu,
- nerede olduğunu,
- neden olduğunu,
- neyin başarısız olduğunu,
- hangi model/tool'un kullanıldığını,
- maliyeti,
- ne yapabileceğini

hızlıca görebilmelidir.

---

## 2. Primary Layout

Global shell:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ORYNT                  Search / Command             + New Work   ● LOCAL │
├──────────────┬──────────────────────────────────────────────┬──────────────┤
│              │                                              │              │
│ Navigation   │                MAIN VIEW                     │  INSPECTOR   │
│              │                                              │  optional    │
│              │                                              │              │
├──────────────┴──────────────────────────────────────────────┴──────────────┤
│ ● Runtime healthy       Active Runs       Models       Estimated API cost │
└────────────────────────────────────────────────────────────────────────────┘
```

Inspector **ana içeriğin yerine geçmez**.

Ana sonuçlar main detail area içinde görünür.

Inspector seçilmiş technical object için büyüteçtir.

---

## 3. V1 Navigation

```text
Overview
Work
Runs
MasterMind
Resources
Integrations
Settings
```

Full Analytics V1 navigation'a eklenmez.

Telemetry Overview ve detail ekranlarında kullanılır.

---

## 4. Overview

Amaç: "Şu anda dünyamda ne oluyor?" sorusuna birkaç saniyede cevap.

```text
4 Active       3 Need Attention       2 Ready       1 Failed

ACTIVE WORK
PAY-1842     Implementing        08:42
CORE-291     Reviewing           03:18
MOB-918      Investigating       11:04

NEEDS ATTENTION
INFRA-82     Verification failed           Inspect →
PAY-1811     Ready to merge                Review →
CORE-229     Waiting for feedback          Respond →

RECENT OUTCOMES
✓ MOB-881    Completed
✗ PAY-1721   Failed verification

TODAY
Completed              12
Human interventions    5
First-pass success     84%
Est. API cost          $4.82
```

Cost görünür ama headline değildir.

---

## 5. Work — Master / Detail / Optional Inspector

Work ekranının ana pattern'i:

```text
┌─────────────────────┬───────────────────────────────────┬──────────────┐
│ WORK LIST           │ WORK DETAIL                       │ INSPECTOR    │
│                     │                                   │ optional     │
│ PAY-1842            │ PAY-1842                          │              │
│ CORE-291            │                                   │              │
│ MOB-918             │ Stage navigation                  │              │
│ ...                 │                                   │              │
└─────────────────────┴───────────────────────────────────┴──────────────┘
```

### Work List

Global, cross-project.

Filtreler:

- Source
- Project
- Repository
- Status
- Risk
- Workflow
- Owner

Project seçmek app context'ini değiştirmez; sadece filtreler.

### One-click rule

> Work listeden bir work item'ın kritik execution state'i en fazla bir etkileşim uzakta olmalıdır.

Örneğin satırdaki `Review Failed` statusuna tıklamak doğrudan Review stage'ini açabilir.

---

## 6. Work Detail

Header:

```text
PAY-1842
Fix token refresh race condition

Running · Medium Risk · Jira · Payments

Run #4 ● Active        Previous Runs ▾
```

Ana stage navigation:

```text
Triage | Context | Analysis | Plan | Implementation | Verification | Review | Outcome
```

Stage'ler execution planına göre dinamik görünür/gizlenir.

Stage strip aynı zamanda:

- navigation
- progress
- status indicator

olarak çalışır.

### Status semantics

Örnek:

```text
✓ completed
● running
! needs attention
✕ failed
○ pending
```

---

## 7. Stage Detail

Her stage'in ilk görünümü Summary olmalıdır.

Ortak derinlik prensibi:

```text
Summary
Details
Raw
```

### Analysis örneği

```text
ANALYSIS

Summary
Root cause is likely concurrent token invalidation.

Independent workers
Analyst A       completed
Analyst B       completed

Agreement
High

Key evidence
...
```

### Implementation örneği

```text
IMPLEMENTATION

Summary
6 files changed.
Retry flow made atomic.

Current worker
Model X

Verification not started yet.
```

### Raw

Power user erişimi:

- model request
- model response
- tool calls
- tool outputs
- raw events

---

## 8. Stage Actions

Her uygun stage üzerinde:

```text
Give Feedback
Re-run This Stage
Re-run From Here
Change Model & Re-run
Stop Run
```

Re-run From Here downstream invalidation'ı açıkça gösterir:

```text
Re-running Analysis will invalidate the current:

Plan
Implementation
Verification
Review

Previous results will remain in history.

[Continue]
```

Bu davranış predictable olmalıdır.

---

## 9. Runs

Global Runs ekranı:

- Running
- Waiting
- Failed
- Completed
- historical runs

Tek Run detail:

```text
RUN #4912                            ● RUNNING
PAY-1842

✓ Triage
✓ Context
✓ Analysis
● Implementation
○ Verification
○ Review
```

Alt/yan activity timeline:

```text
06:31 Analysis completed
06:32 Implementation started
06:35 Tests failed
06:37 Implementation updated
```

Structured event'ler gösterilir; anlamsız terminal spam default görünüm değildir.

---

## 10. Inspector

Inspector yalnız secondary object detail içindir.

Seçilebilen örnekler:

- Worker
- Finding
- Model Call
- Tool Call
- Event
- Decision
- Artifact
- Policy

### Finding Inspector

```text
SECURITY FINDING

Severity
High

Summary
Possible token reuse race.

Source
Independent Security Review

Policy
SEC-018

Evidence
TokenService.rs:184
```

### Model Call Inspector

```text
Model
Provider
Local / Cloud
Tokens
Estimated cost
Latency
Context sent
```

### Decision Inspector

```text
Decision
Reason
Evidence
Alternatives
Policy / Guard
Expected impact
```

Inspector kapanabilir/pinlenebilir yapı için uygun tasarlanmalıdır; pinning V1 zorunlu değildir.

---

## 11. MasterMind

MasterMind chat ekranı değildir.

```text
MASTERMIND                    ● ACTIVE

SYSTEM STATE
Active work             7
Running workers        11
Need attention          2
Runtime health      Healthy

RECENT DECISIONS
06:32 Added verification worker
06:29 Re-routed review to Model B
06:22 Returned PAY-1842 to Analysis
```

Bir karar tıklanınca Decision Journal detail açılır.

### Why? primitive

Önemli routing / risk / rewind / policy kararlarının yanında kullanıcı:

```text
Why?
```

ile gerekçeye ulaşabilmelidir.

---

## 12. Review Workspace

Review raw diff ile başlamaz.

İlk ekran:

```text
WHAT CHANGED

Token refresh invalidation is now atomic.

WHY

Concurrent refresh requests could previously overlap.

RISK
Medium

VERIFICATION
Build              PASS
Tests              PASS
Static analysis    PASS

REVIEW
Code Review        PASS
Security Review    1 finding

POLICIES
23 / 24 passed

REMAINING CONCERNS
1
```

Tabs:

```text
Changes | Verification | Review | Policies | Raw Diff
```

Kullanıcı koddan kopmaz; gerektiğinde Raw Diff'e iner.

---

## 13. Policy UI

Policy listesi searchable ve hızlı olmalıdır.

```text
POLICIES

Search...

Development
☑ General Code Quality
☑ Error Handling
☑ Testing Standards
☐ TDD

Security
☑ Secret Protection
☑ Input Validation
```

Policy toggle **tek etkileşimle** yapılabilmelidir.

Detay paneli:

```text
Policy
Type
Scope
Severity
Enforcement
Definition
Inherited / Local
```

Policy edit destructive/impactful ise confirmation gerekebilir.

---

## 14. Model UI

Settings → Models:

```text
MODELS

Local
● Qwen Coder Local
● Local Review

Cloud
● Provider A / Model X
● Provider B / Model Y
```

Model detail:

- location
- endpoint/provider
- capabilities
- health
- pricing
- trust/data boundary
- observed performance

Stage configuration:

```text
Review

Cloud
Allowed

Optimization
Balanced

Preferred
Auto

Fallback
Local Review
```

`Auto` seçimi MasterMind/Router'ın policy içinde adaptif seçim yapmasına izin verir.

---

## 15. Resources

```text
Resources

Projects
Repositories
Local Workspaces
Knowledge
```

Project detail:

```text
PAYMENTS

Source mappings
Jira / PAY

Repositories
payments-api
payments-web

Local workspaces
...

Effective policies
...

Model restrictions
...
```

Project burada context inventory'dir.

---

## 16. Integrations

```text
CONNECTED

Jira          Healthy
GitHub        Healthy
Local Git     Healthy
```

Detail:

- Connection
- Capabilities
- Permissions
- Health
- Events / logs

UI vendor-specific davranışları core mental model haline getirmemelidir.

---

## 17. Settings

V1:

- General
- Runtime
- Models
- Policies
- Appearance
- Notifications
- Developer / Advanced

Credential alanları secret'ı geri göstermemelidir.

---

## 18. Bottom Runtime Bar

Sessiz fakat sürekli local-first feedback:

```text
● Local Runtime     4 Active Runs     7 Workers     3 Models     API $4.82
```

Runtime health detail erişilebilir.

---

## 19. Keyboard & Command Palette

V1 full shortcut set gerektirmez; UI keyboard-first olmaya uygun tasarlanır.

Minimum:

- Command Palette
- Search
- Work item navigation
- Inspector close
- common actions için shortcut-friendly component structure

Command palette başlangıçta navigation/search odaklı olabilir.

---

## 20. Visual Language

Hedef:

- technical elegance
- dense but calm
- high information clarity
- enterprise trust
- understated motion

Kaçınılacaklar:

- neon/cyberpunk overload
- chat-first layout
- large decorative gradients
- constant glowing AI orb
- unnecessary animation
- excessive cards

Renk semantiği:

```text
Green   completed / healthy
Blue    running / active
Amber   waiting / attention
Red     failed / dangerous
Grey    idle / disabled
```

Ana UI sans-serif; technical IDs/metrics için monospace kullanılabilir.

---

## 21. V1 UX Non-goals

- Virtual Office
- Advanced graph editor
- Timeline scrubber
- full split-view system
- saved views
- advanced density modes
- natural-language UI commands
- elaborate dashboard analytics

Bunlar mimariyi bozmadan daha sonra eklenebilir.
