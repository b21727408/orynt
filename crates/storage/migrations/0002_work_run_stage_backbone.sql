CREATE TABLE work_items (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
    objective TEXT NOT NULL,
    created_at INTEGER NOT NULL CHECK(created_at >= 0),
    updated_at INTEGER NOT NULL CHECK(updated_at >= created_at)
);
CREATE INDEX work_items_recent ON work_items(updated_at DESC, id DESC);

CREATE TABLE runs (
    id TEXT PRIMARY KEY NOT NULL,
    work_item_id TEXT NOT NULL REFERENCES work_items(id),
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
    created_at INTEGER NOT NULL,
    started_at INTEGER NOT NULL CHECK(started_at >= created_at),
    completed_at INTEGER,
    UNIQUE(id, work_item_id),
    CHECK((status = 'running' AND completed_at IS NULL) OR
          (status != 'running' AND completed_at >= started_at AND completed_at IS NOT NULL))
);
CREATE INDEX runs_work_history ON runs(work_item_id, created_at DESC, id DESC);

CREATE TABLE execution_plan_revisions (
    id TEXT PRIMARY KEY NOT NULL,
    run_id TEXT NOT NULL REFERENCES runs(id),
    revision_number INTEGER NOT NULL CHECK(revision_number > 0),
    created_at INTEGER NOT NULL,
    UNIQUE(run_id, revision_number),
    UNIQUE(id, run_id)
);

CREATE TABLE stage_plans (
    execution_plan_revision_id TEXT NOT NULL REFERENCES execution_plan_revisions(id),
    position INTEGER NOT NULL CHECK(position >= 0),
    stage_kind TEXT NOT NULL CHECK(stage_kind IN ('triage', 'context', 'analysis', 'planning', 'implementation', 'verification', 'review', 'outcome')),
    PRIMARY KEY(execution_plan_revision_id, position),
    UNIQUE(execution_plan_revision_id, stage_kind)
);

CREATE TABLE stage_executions (
    id TEXT PRIMARY KEY NOT NULL,
    run_id TEXT NOT NULL REFERENCES runs(id),
    execution_plan_revision_id TEXT NOT NULL,
    stage_kind TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    simulation_summary TEXT,
    failure TEXT,
    FOREIGN KEY(execution_plan_revision_id, run_id) REFERENCES execution_plan_revisions(id, run_id),
    FOREIGN KEY(execution_plan_revision_id, stage_kind) REFERENCES stage_plans(execution_plan_revision_id, stage_kind),
    UNIQUE(execution_plan_revision_id, stage_kind),
    CHECK((status = 'running' AND completed_at IS NULL AND simulation_summary IS NULL AND failure IS NULL) OR
          (status = 'completed' AND completed_at IS NOT NULL AND completed_at >= started_at AND simulation_summary IS NOT NULL AND failure IS NULL) OR
          (status = 'failed' AND completed_at IS NOT NULL AND completed_at >= started_at AND simulation_summary IS NULL AND failure IS NOT NULL))
);
CREATE INDEX stage_executions_run ON stage_executions(run_id, started_at, id);

CREATE TABLE events (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    work_item_id TEXT NOT NULL REFERENCES work_items(id),
    run_id TEXT,
    occurred_at INTEGER NOT NULL CHECK(occurred_at >= 0),
    kind TEXT NOT NULL CHECK(kind IN ('work.created', 'run.created', 'run.started', 'stage.started', 'stage.completed', 'stage.failed', 'run.failed', 'run.completed')),
    payload TEXT NOT NULL CHECK(json_valid(payload)),
    FOREIGN KEY(run_id, work_item_id) REFERENCES runs(id, work_item_id),
    CHECK((kind = 'work.created' AND run_id IS NULL) OR (kind != 'work.created' AND run_id IS NOT NULL))
);
CREATE INDEX events_work_order ON events(work_item_id, sequence);
CREATE INDEX events_run_order ON events(run_id, sequence);
