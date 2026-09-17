-- SQLx applies this migration transactionally. Both rebuilt tables are leaves:
-- their foreign keys point to unchanged tables, so enforcement stays enabled.
CREATE TABLE stage_executions_rebuild (
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
    CHECK((status = 'running' AND completed_at IS NULL AND simulation_summary IS NULL AND failure IS NULL) OR
          (status = 'completed' AND completed_at IS NOT NULL AND completed_at >= started_at AND simulation_summary IS NOT NULL AND failure IS NULL) OR
          (status = 'failed' AND completed_at IS NOT NULL AND completed_at >= started_at AND simulation_summary IS NULL AND failure IS NOT NULL))
);
INSERT INTO stage_executions_rebuild
    (id, run_id, execution_plan_revision_id, stage_kind, status, started_at, completed_at, simulation_summary, failure)
SELECT id, run_id, execution_plan_revision_id, stage_kind, status, started_at, completed_at, simulation_summary, failure
FROM stage_executions;
DROP TABLE stage_executions;
ALTER TABLE stage_executions_rebuild RENAME TO stage_executions;
CREATE INDEX stage_executions_run ON stage_executions(run_id, started_at, id);

-- EventKind remains typed at the application write boundary. The durable
-- discriminator and optional Run scope must also support later typed variants.
CREATE TABLE events_rebuild (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    work_item_id TEXT NOT NULL REFERENCES work_items(id),
    run_id TEXT,
    occurred_at INTEGER NOT NULL CHECK(occurred_at >= 0),
    kind TEXT NOT NULL,
    payload TEXT NOT NULL CHECK(json_valid(payload)),
    FOREIGN KEY(run_id, work_item_id) REFERENCES runs(id, work_item_id)
);
INSERT INTO events_rebuild (sequence, id, work_item_id, run_id, occurred_at, kind, payload)
SELECT sequence, id, work_item_id, run_id, occurred_at, kind, payload
FROM events ORDER BY sequence;
-- Preserve AUTOINCREMENT's high-water mark even if it exceeds retained rows.
INSERT INTO sqlite_sequence (name, seq)
SELECT 'events_rebuild', seq FROM sqlite_sequence
WHERE name = 'events' AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'events_rebuild');
UPDATE sqlite_sequence
SET seq = MAX(seq, COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'events'), 0))
WHERE name = 'events_rebuild';
DROP TABLE events;
ALTER TABLE events_rebuild RENAME TO events;
CREATE INDEX events_work_order ON events(work_item_id, sequence);
CREATE INDEX events_run_order ON events(run_id, sequence);
