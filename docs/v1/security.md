# V1 Security & Trust Model

## Purpose

Orynt is a local-first desktop system that can read repositories, call models, execute tools/processes, inspect diffs, and interact with external work systems. Trust boundaries are therefore a first-class product concern.

> **Treat external content, repository content, model output, and tool output as untrusted input.**

Being local does not make an input trusted.

## Trust boundaries

### Trusted control plane

Orynt-owned application logic, policy/guard evaluation, explicit user decisions, and persisted authorization/configuration form the trusted control plane.

Free-form model output never becomes authority by itself.

### Untrusted model output

A model may propose actions or produce inputs to deterministic application logic. It cannot:

- grant itself capabilities
- override a policy deny
- change a local/cloud data boundary
- silently reinterpret a human decision
- claim deterministic verification succeeded without evidence
- bypass the shared Action Plane / Guard path

### Untrusted repository/work-source content

Repository files, issue text, README files, test fixtures, diffs, command output, Git hooks, symlinks, and downloaded artifacts may be malicious or misleading.

Instructions embedded in those inputs are data, not authority. They cannot redefine Orynt policy, `AGENTS.md`, security rules, or human approvals.

## Prompt injection posture

V1 assumes prompt injection is possible.

Mitigations:

- separate system/task/context instructions
- label retrieved external content as untrusted
- send the minimum necessary context to models
- enforce policy/capabilities outside the model
- validate destructive/security-sensitive actions deterministically
- retain structured evidence for decisions
- use independent review when risk requires it

Prompt wording alone is not a security boundary.

## Local/cloud model boundary

Every model route knows whether the model is local or cloud.

A stage/model policy may deny cloud usage.

```text
policy: cloud = DENY
→ no route may send that stage's data to a cloud endpoint
```

MasterMind, fallback routing, retries, or UI convenience must not bypass this.

## Secrets

Use OS-native secure credential storage.

Never:

- persist plaintext secrets in SQLite
- log secrets
- place secrets into PR descriptions or Decision Journal entries
- include secrets in model prompts unless a future explicit capability requires it

Redact secrets from events/errors/tool output/support diagnostics where practical.

## Filesystem boundary

Filesystem/process operations require an explicit workspace/root context.

Protect against:

- `..` traversal
- absolute-path escape
- unsafe symlink resolution
- accidental writes to unrelated repositories
- destructive recursive operations
- temporary-file leakage

Paths from models/external content are untrusted and must be normalized/validated before sensitive use.

## Process/tool execution

Process execution is a high-risk capability.

Rules:

- structured executable + argv, not concatenated shell strings
- explicit working directory
- explicit environment handling
- cancellation/timeouts
- capture exit status and evidence
- non-zero exit is not success
- no privilege escalation
- avoid a shell unless shell semantics are explicitly required

Tool output is untrusted input.

## Repository scripts and Git hooks

Repository-provided scripts/hooks are not trusted merely because they are in the repository.

Commands should be visible/auditable and execute inside the intended capability/workspace boundary.

Git hooks must not become an implicit code-execution path controlled by an untrusted repository.

## Network boundary

Avoid hidden network behavior.

Network access should occur through explicit adapters/capabilities such as:

- model providers
- Jira
- GitHub
- future update service

Do not turn arbitrary model-generated URLs into unrestricted network access.

## Destructive actions

Deleting files, force operations, repository resets, overwriting user changes, publishing remote changes, and future deployment actions require explicit capability + policy/guard evaluation.

V1 retains human merge as the boundary. Auto-merge is not a V1 feature.

## Human-control invariant

Explicit user decisions outrank autonomous convenience.

MasterMind must not silently:

- reverse user stop/pause
- override trust/data-boundary policy
- discard historical evidence
- rewrite a user's accepted/rejected decision
- perform a destructive action outside its permitted action set

## Persistence and audit

Security-relevant decisions should be explainable with structured records, such as:

- selected model and local/cloud classification
- policy checks
- denied actions
- guard results
- destructive-action requests
- verification results
- user/MasterMind interventions

Raw private chain-of-thought is not an audit mechanism.

## SQLite lifecycle

SQLite is durable product data.

V1 should include:

- transactional migrations
- migration tests
- clear migration-failure behavior
- no destructive schema reset as a normal upgrade path
- recovery-aware startup errors

Later hardening covers backup/export, corruption recovery, diagnostics, and retention.

## Release and software supply chain

Product hardening must address:

- signed desktop artifacts
- macOS/Windows code signing
- secure updates
- rollback/recovery
- dependency/license review
- SBOM
- build provenance where practical
- release channels
- controlled CI inputs

Prefer established tooling over a custom supply-chain framework.

## Threat-model review triggers

Revisit this model before adding a new trust boundary, including:

- connector/provider
- process/tool capability
- writes outside existing workspace boundaries
- arbitrary network access
- Company Hub
- plugin/MCP execution
- updater
- auto-merge/deployment
- centralized organizational data

Repository coding agents must not edit this document. If implementation exposes an uncovered security decision, stop and ask the user.
