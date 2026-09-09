# V1 Terminology

Kod, UI ve dokümantasyonda aynı kavrama birden fazla ad vermemek için canonical vocabulary.

---

## WorkItem

Orynt'ın bildiği bir iş birimi.

Kaynağı Jira olabilir; ileride Notion, Linear, email, kullanıcı girdisi vb. olabilir.

`WorkItem` vendor-specific nesne değildir.

Örnek metadata:

- id
- title
- description/objective
- source
- external reference
- project/context references
- state
- priority/risk
- created/updated timestamps

---

## WorkSource

Orynt'a work item sağlayan dış sistem adapter abstraction'ı.

Örnek provider:

- Jira (V1)
- Notion (future)
- Linear (future)

Bir WorkSource core model değildir.

---

## Project

Navigation root değil; context/configuration scope'udur.

Project şu tür bilgileri resolve etmeye yardım eder:

- repositories
- local workspaces
- policies
- knowledge
- model restrictions
- external source mapping

Kullanıcı aynı anda birçok Project'ten WorkItem görebilir.

---

## Repository

Bir code/content repository.

Bir Project bir veya birden fazla Repository içerebilir.

---

## LocalWorkspace

Belirli bir Repository'nin kullanıcının cihazındaki çalışma alanı.

---

## Run

Bir WorkItem üzerinde yapılan tek execution attempt.

Aynı WorkItem birden fazla Run'a sahip olabilir.

Eski Run değiştirilmeyip history olarak korunur.

---

## Stage

Execution plan içindeki mantıksal aşama tipi.

V1 supported stage types:

- Triage
- Context
- Analysis
- Planning
- Implementation
- Verification
- Review
- Outcome

---

## StageExecution

Belirli bir Run içinde bir Stage'in tek execution instance'ı.

Aynı Stage rerun edildiğinde yeni StageExecution oluşturulabilir veya revision olarak izlenebilir; history kaybolmamalıdır.

---

## Worker

Bir Stage içinde tanımlı görevi yürüten execution participant.

Worker:

- model-backed AI worker,
- deterministic tool runner,
- future'da başka bir capability provider

olabilir.

"Worker" ile "model" aynı şey değildir.

---

## Agent

AI-backed Worker için kullanılabilecek ürün terimi.

Core model mümkün olduğunca `Worker` kavramını tercih eder; çünkü her worker LLM olmak zorunda değildir.

---

## MasterMind

Orynt'ın bounded supervisory control loop'u.

MasterMind worker değildir.

Görevi:

- sistemi observe etmek,
- execution state değerlendirmek,
- bounded kararlar vermek,
- routing/rewind/retry gibi müdahaleleri guard ve policy sınırında yönetmek,
- kararlarını kaydetmek.

Modes:

- Observe
- Suggest
- Act

---

## Triage

Bir WorkItem'ın başlangıç execution hipotezini oluşturan planning stage.

Triage sadece "uygun / uygun değil" sınıflandırması değildir.

Şunları değerlendirebilir:

- risk
- complexity
- ambiguity
- context completeness
- work type
- stage selection
- worker counts
- reviewer composition
- model strategy
- verification depth

---

## ExecutionPlan

Bir Run'ın nasıl çalışacağını açıklayan versioned plan.

İçerebilir:

- stages
- dependencies/order
- worker counts
- model policies
- verification requirements
- budget/limits
- applicable policies

---

## ModelRegistry

Kullanılabilir local/cloud modellerin kaydı.

Model metadata, health, pricing, trust boundary ve capability bilgilerini içerir.

---

## ModelRoute

Bir Worker/Stage için seçilen model ve seçim gerekçesi.

---

## ExperienceMemory

Geçmiş execution'lardan türetilen ölçülebilir performans kayıtları.

V1'de özellikle:

- model × stage
- model × work type
- success
- duration
- cost
- intervention

verileri.

ExperienceMemory gizemli "AI hafızası" değildir; explainable telemetry ve aggregate performans verisidir.

---

## Policy

Sistemin neye izin verdiğini veya neyi zorunlu tuttuğunu açıklayan kural.

### Deterministic Policy

Tool/rule engine ile objektif doğrulanabilen kural.

### Semantic Review Policy

Semantik AI review gerektiren kural.

### Workflow Policy

Execution sırasını veya stage davranışını etkileyen kural.

---

## EffectivePolicySet

Bir WorkItem/Run için gerçekten geçerli policy'lerin resolve edilmiş toplamı.

Gelecekte organization/project/repository inheritance ile oluşturulabilir.

---

## Capability

Sistemin gerçekleştirebildiği atomik yetenek.

Örnek:

```text
work.read
repository.read
process.execute
pull_request.create
```

Provider/vendor adı capability değildir.

---

## Connector / Adapter

Dış bir sistemin Orynt abstraction'larını uygulayan entegrasyon katmanı.

Örnek:

- Jira adapter → WorkSource
- GitHub adapter → CodeHost capabilities
- future Notion adapter → WorkSource

---

## ToolCall

Bir deterministic/external tool invocation.

ModelCall ile aynı şey değildir.

---

## ModelCall

Bir modele gönderilen tek request/response interaction.

Token/cost/latency telemetry taşır.

---

## Verification

Deterministic veya objective checks katmanı.

Örnek:

- build
- test
- lint
- typecheck
- static analysis

---

## Review

Bir değişiklik veya outcome hakkında bağımsız değerlendirme.

AI review, Verification'ın alternatifi değildir.

---

## Finding

Verification veya Review sırasında bulunan structured problem/uyarı.

Minimum:

- severity
- source
- summary
- evidence
- location (varsa)
- policy reference (varsa)

---

## Artifact

Execution sırasında üretilen veya kullanılan kalıcı çıktı.

Örnek:

- analysis
- patch
- diff
- test report
- review report
- PR reference
- generated document

---

## Event

Sistemde gerçekleşen structured runtime olayı.

Event log sadece debug text değildir; Activity Timeline'ın kaynağıdır.

---

## Decision

MasterMind veya başka bir decision-maker tarafından alınan structured karar.

Decision Journal'da görünür.

---

## DecisionJournal

Important decisions için append-only / auditable kayıt yüzeyi.

Kullanıcı "neden?" sorusunun cevabını burada bulur.

---

## Re-run This Stage

Yalnız seçilen stage'i yeniden çalıştırma.

Downstream invalidation semantiği stage output dependency'lerine göre açıkça tanımlanmalıdır.

---

## Re-run From Here

Seçilen stage ve downstream execution'ı yeni sonuçlarla yeniden çalıştırma.

Eski downstream sonuçları history olarak korunur ancak yeni run path için stale kabul edilir.

---

## Rewind

UI/product terimi olarak daha önceki bir stage'e dönerek execution'ı oradan yeniden sürdürme.

Core'da bu işlem explicit execution revision / rerun semantics ile temsil edilmelidir.

---

## Inspector

Ana içeriğin yerine geçmeyen, seçilen obje için contextual secondary detail panel.

Örnek:

- finding
- model call
- tool call
- worker
- decision
- event

---

## ReviewWorkspace

Kullanıcının değişikliği raw diff'ten önce intent, evidence, verification ve finding'ler üzerinden anlayabildiği review yüzeyi.

---

## CompanyNode

Kullanıcının cihazında çalışan Orynt runtime instance'ı.

---

## CompanyHub

Future/optional organizational server boundary.

Shared policy, model registry, aggregate experience ve organization memory için kullanılabilir.

V1 local node'un çalışması CompanyHub'a zorunlu bağlı değildir.
