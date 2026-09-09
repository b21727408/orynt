# V1 Scope — Local Execution Workbench

## 1. Amaç

V1'in amacı Orynt'ın bütün uzun vadeli vizyonunu gerçekleştirmek değildir.

V1 şu çekirdek tezi kanıtlamalıdır:

> Kullanıcı, farklı projelerdeki işleri kendi bilgisayarında çalışan Orynt'a verebilmeli; Orynt işi triage edip uygun execution planını oluşturmalı, local/cloud modeller ve deterministic tools ile işi yürütmeli, kullanıcı ise her aşamayı tek tıkla görebilmeli ve istediği aşamaya müdahale edebilmelidir.

V1 sonunda ürün "profesyonel rewrite" seviyesinin ötesine geçmeli ve Orynt'ın gelecekte büyüyebileceği gerçek runtime temelini oluşturmalıdır.

---

## 2. Must Have

### 2.1 Local-first desktop runtime

- Rust core
- Tauri 2 desktop shell
- React + TypeScript UI
- SQLite persistence
- Uygulama merkezi bir Orynt cloud servisine zorunlu olarak bağlı olmadan çalışabilmeli
- Execution state restart sonrasında korunmalı
- Uzun süren işler kullanıcı aktif olarak ekrana bakmasa da devam edebilmeli
- Local process/tool execution kontrollü bir runtime üzerinden yapılmalı

### 2.2 Canonical Work Model

Core model vendor-specific olmamalıdır.

Temel ilişki:

```text
WorkItem
└── Run
    └── StageExecution
        ├── WorkerExecution
        ├── ModelCall
        ├── ToolCall
        ├── Finding
        ├── Artifact
        ├── Decision
        └── Event
```

Bir WorkItem birden fazla Run'a sahip olabilir.

Eski Run'lar overwrite edilmez.

### 2.3 Vendor-neutral WorkSource

Jira core model değildir.

V1:

- `WorkSource` abstraction
- Jira adapter
- Jira'dan work item alma
- Birden fazla Jira project key ile çalışma
- Jira metadata/context erişimi
- Gerekli temel write-back işlemleri

Core `WorkItem`, Jira Issue nesnesine bağımlı olmamalıdır.

Gelecekte Notion, Linear, ServiceNow veya başka bir kaynak yeni adapter olarak eklenebilmelidir.

### 2.4 Multi-project context resolution

Kullanıcı tek bir projeye "girmez".

Farklı projelerdeki işler aynı global Work görünümünde bulunabilir.

Sistem work item üzerinden:

```text
source
→ project
→ repository
→ local workspace
→ applicable configuration
```

bağlamını resolve etmelidir.

Project günlük navigation root değil; context/configuration scope'udur.

### 2.5 Triage

Triage V1'in first-class stage'idir.

Triage structured çıktı üretmelidir:

- work type
- risk
- complexity
- ambiguity
- context completeness
- recommended stages
- recommended worker counts
- recommended reviewer composition
- model strategy
- verification depth
- estimated cost / execution class (initially approximate)

Triage sonucu execution planını bounded biçimde şekillendirebilmelidir.

Örnek:

```text
Low-risk work
→ 1 analysis worker
→ 1 implementation worker
→ 1 reviewer

High-risk work
→ 2 independent analysis workers
→ 1 implementation worker
→ verification
→ 3 specialized reviewers
```

### 2.6 Bounded Dynamic Execution Plan

V1 tamamen hard-coded tek pipeline olmamalıdır.

Supported stage types:

- Triage
- Context
- Analysis
- Planning
- Implementation
- Verification
- Review
- Outcome

Her Run her stage'i kullanmak zorunda değildir.

Bir stage 0..N worker içerebilir.

V1'de MasterMind sıfırdan sınırsız organizasyon yaratmaz. Tanımlı primitive'ler ve guard'lar içinde planı şekillendirir.

### 2.7 Arbitrary-stage feedback / rewind / rerun

Kullanıcı herhangi bir uygun stage üzerinde:

- Give Feedback
- Re-run This Stage
- Re-run From Here
- Change Model & Re-run
- Stop Run

işlemlerini yapabilmelidir.

`Re-run From Here` seçilen stage'den sonraki downstream çıktıları stale/invalidated olarak işaretlemelidir.

Örneğin Analysis yeniden çalıştırılırsa önceki Planning / Implementation / Verification / Review sonuçları yeni execution için geçerli kabul edilmez.

Tam execution branching V1 için zorunlu değildir.

### 2.8 Model Registry — local + cloud

Model bir string dropdown değildir; sistem resource'udur.

Her model için minimum metadata:

- id / display name
- provider
- endpoint
- local vs cloud
- supported capabilities
- context limits
- tool support
- vision support
- pricing metadata (varsa)
- availability / health
- trust / data boundary metadata

OpenAI-compatible endpoint desteği V1'de önemlidir.

Local model ve cloud model aynı registry içinde yaşayabilmelidir.

### 2.9 Stage-level Model Policy

Her stage model kullanım sınırına sahip olabilmelidir.

Örnek:

```text
Implementation
cloud models = denied
local models = allowed

Review
cloud models = allowed

Security Review
approved models only
```

MasterMind veya router bu policy'leri override edemez.

Policy izin veriyorsa MasterMind:

- daha güçlü modele escalate edebilir,
- daha ucuz modele downgrade edebilir,
- unavailable modeli fallback modele değiştirebilir.

### 2.10 Adaptive Model Routing

V1 routing minimum olarak şu sinyalleri kullanabilmelidir:

- policy compatibility
- model availability
- historical success
- stage suitability
- estimated API cost
- latency
- local/cloud preference

Routing kararının nedeni Decision Journal'da görünür olmalıdır.

İlk sürümde ağır ML gerekmez; explainable scoring/rule-based routing yeterlidir.

### 2.11 Experience Memory

V1 performans verisini toplamaya başlamalıdır.

Minimum:

- model
- stage
- work class
- attempt count
- success/failure
- duration
- API cost
- token usage
- human intervention count
- rewind count
- verification/review outcome

İlk aggregate'lar:

```text
Model × Stage
Model × Work Type
```

Gelecekte Project / Language / Risk vb. boyutlara genişleyebilmelidir.

### 2.12 Adaptive Triage Foundation

V1'de Triage kendi prompt'unu gizlice self-modify etmez.

Ancak sistem şunları kaydetmelidir:

- triage tahmini
- MasterMind override'ı
- actual execution shape
- actual cost / duration
- downstream failures
- rewinds
- human interventions
- final outcome

MasterMind runtime sırasında triage önerisini guard'lar içinde override edebilir.

V1 sonunda Triage calibration ölçülebilir olmalıdır.

Tam otomatik uzun dönem adaptation zorunlu değildir; veri modeli ve feedback loop hazır olmalıdır.

### 2.13 MasterMind

V1 MasterMind'in rolü:

**bounded execution supervisor**

Yapabilmeli:

- global execution state observe etmek
- failed / blocked / unhealthy durumları fark etmek
- model swap önermek veya policy izin veriyorsa uygulamak
- retry / rerun / rewind önermek veya bounded biçimde uygulamak
- triage execution planını guard'lar içinde güçlendirmek
- worker/reviewer sayısını bounded biçimde ayarlamak
- pause/resume
- user decision'larına dokunmamak
- running work'e güvenli olmayan müdahale yapmamak
- her önemli kararı kaydetmek

Modes:

- Observe
- Suggest
- Act

### 2.14 Decision Journal

Her önemli MasterMind kararı structured kayıt olmalıdır:

- decision
- reason
- evidence
- alternatives considered (varsa)
- policy/guard result
- expected cost impact
- expected time impact
- actual outcome (sonradan bağlanabilir)

Raw private chain-of-thought bir ürün özelliği değildir.

Kullanıcıya kararın gerekçesi ve kanıtı gösterilir.

### 2.15 Policy Library

V1'de policy first-class concept olmalıdır.

UI'da policy'ler searchable listeden **tek tıkla enable/disable** edilebilmelidir.

Minimum scope:

- organization / project / repository scope metadata
- built-in küçük başlangıç policy seti
- custom policy oluşturma
- effective policy listesi
- severity
- enforcement mode

Policy tipleri:

1. **Deterministic Policy**
2. **Semantic Review Policy**
3. **Workflow Policy**

V1 çok büyük policy marketplace içermez.

### 2.16 Verification Layer

AI review tek başına yeterli değildir.

Generic verification runner:

- build
- test
- lint
- typecheck
- static-analysis
- custom command

Structured sonuç üretmelidir:

```text
check
status
duration
summary
raw output reference
```

V1 birçok vendor-specific scanner entegrasyonu yapmak zorunda değildir.

Interface gelecekte scanner adapter'larına açık olmalıdır.

### 2.17 Independent Review

Review worker implementer'ın reasoning/history'sine bağımlı olmadan bağımsız evaluation yapabilmelidir.

Review context minimum olarak:

- objective / requirement
- relevant context
- final change
- applicable policies
- verification evidence

Review findings structured olmalıdır:

- severity
- summary
- evidence
- policy id (varsa)
- file/location (varsa)
- recommended verification/remediation

### 2.18 Review Workspace

V1 kullanıcıya raw diff'ten önce anlamlı review yüzeyi sunmalıdır.

Minimum:

- What changed
- Why
- Files changed
- Verification results
- Review findings
- Policy findings
- Remaining concerns
- Raw diff

Amaç kullanıcıyı koddan koparmak değil; review için gereken zihinsel yükü azaltmaktır.

### 2.19 Git / Code Host

V1:

- local Git repository detection
- branch/worktree strategy
- diff
- change tracking
- commit/push gerektiğinde
- PR preparation

Code host abstraction vendor-neutral tasarlanmalıdır.

İlk adapter GitHub olabilir.

Auto merge V1'de yoktur.

### 2.20 Cost / Usage Visibility

Maliyet saklanmaz ama ana ekranın korkutucu headline'ı yapılmaz.

Per Run / Stage:

- model calls
- input/output tokens
- estimated API cost
- duration
- local/cloud

Overview'da küçük özet gösterilebilir.

### 2.21 Company Hub Boundary

V1 local node standalone çalışabilmelidir.

Ancak mimari Company Hub'a bağlanabilecek şekilde tasarlanmalıdır.

Hub üzerinden gelecekte:

- shared policies
- shared model registry
- shared configuration
- aggregate model performance
- organizational memory

paylaşılabilir.

V1 için full enterprise server/admin console zorunlu değildir.

**Should:** minimal protocol/client ve basit local development hub prototipi.

Ham source code veya tüm model context'inin merkezi hub'a otomatik gönderilmesi varsayılan davranış olmamalıdır.

---

## 3. V1 UI Scope

Zorunlu ana alanlar:

1. Overview
2. Work
3. Runs
4. MasterMind
5. Resources
6. Integrations
7. Settings

Review Workspace, Work/Run içinde yaşar.

Full Analytics ekranı V1 için zorunlu değildir; gerekli telemetry toplanır ve Overview / Run details içinde temel metrikler görünür.

---

## 4. Not V1

Aşağıdakiler V1'in önünü kesmemelidir:

- Virtual Office / PixiJS live office
- Email integration
- Notion adapter
- Linear adapter
- ServiceNow adapter
- PDF / PRD → Jira decomposition
- Full dynamic organizational hierarchy
- Full workflow marketplace
- Büyük policy marketplace
- Full TDD workflow engine
- Cost Optimizer agent
- Efficiency Advisor
- Advanced Performance Memory ML
- Full automatic triage self-training
- Distributed execution nodes
- Full Company Hub admin console
- SSO / SCIM / fleet management
- Full analytics suite
- Execution branching comparison UI
- Replay / time travel
- Integration marketplace

Bu özellikler `ideas.md` içinde tutulur.

---

## 5. V1 başarı kriterleri

V1 başarılı sayılabilmesi için gerçek kullanımda:

1. Farklı projelerdeki işler aynı Work alanında güvenilir biçimde yönetilebilmeli.
2. Context/repository mapping kullanıcıyı sürekli proje seçmeye zorlamamalı.
3. Bir Run'ın nerede olduğu birkaç saniyede anlaşılmalı.
4. Analysis / Implementation / Verification / Review gibi kritik stage sonuçlarına tek etkileşimle ulaşılabilmeli.
5. Kullanıcı istediği stage'e feedback verip oradan tekrar execution başlatabilmeli.
6. Model local/cloud policy'sine aykırı routing yapılamamalı.
7. MasterMind kararı "neden?" sorusuna structured cevap verebilmeli.
8. Verification failure ile AI review finding birbirinden açıkça ayrılmalı.
9. Review Workspace raw diff okumadan önce anlamlı bir karar özeti sunmalı.
10. App restart execution history'yi kaybetmemeli.
11. Eski Run'lar overwrite edilmemeli.
12. Model/stage performans verisi toplanmalı.
13. Triage tahmini ile actual outcome ileride calibration yapılabilecek şekilde ilişkilendirilmeli.
14. Ürün gerçek günlük işte terminal/script yaklaşımından daha rahat hissettirmeli.


---

## Quality / Engineering Foundation

V1 is developed with an enterprise-grade baseline from the start:

- standard formatter/linter/type/test/dependency tooling
- strict Rust/TypeScript boundaries
- modular-monolith crate boundaries
- Codex instructions in root `AGENTS.md`
- no custom generic quality framework/checker in V1
- Orynt-specific invariants tested with normal unit/integration/scenario tests
- preserved structured execution history so later golden-run/eval regression is possible
- Playwright and coverage measurement begin with the first meaningful vertical slice rather than an empty shell

The principle is:

> **Use standard tools for standard problems; write Orynt-specific tests for Orynt-specific risks.**
