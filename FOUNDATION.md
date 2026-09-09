# Foundation Package

This package is the frozen pre-scaffold foundation for Orynt V1.

The next implementation step is a newly written Codex Milestone 0 scaffold prompt based on these files.

There is intentionally no active scaffold prompt in this package.

## Governance freeze

Repository coding agents must not modify:

```text
AGENTS.md
FOUNDATION.md
docs/**
```

If implementation exposes an important undocumented decision, the coding agent stops and asks the user.

All implementation changes reach `main` through a branch + pull request. Direct implementation commits/pushes to `main` are forbidden.
