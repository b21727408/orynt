use orynt_application::work::{
    RepositoryError, RunDetail, RunExecutionState, WorkDetail, WorkRepository, WorkSummary,
};
use orynt_core::{
    event::EventKind,
    execution::{ExecutionPlanRevision, Run, RunStatus, StageExecution, StageStatus},
    ids::{EventId, RunId, WorkItemId},
    work::{Timestamp, WorkItem},
};
use serde::Deserialize;
use sqlx::{Sqlite, SqliteConnection, Transaction};

use crate::{Database, records::*};

#[cfg(test)]
mod tests;

async fn append_event(
    connection: &mut SqliteConnection,
    work_id: WorkItemId,
    run_id: Option<RunId>,
    at: Timestamp,
    kind: EventKind,
) -> Result<(), RepositoryError> {
    #[derive(Deserialize)]
    struct Envelope {
        #[serde(rename = "type")]
        kind: String,
        payload: serde_json::Value,
    }
    let envelope: Envelope =
        serde_json::from_value(serde_json::to_value(kind).map_err(persistence)?)
            .map_err(persistence)?;
    sqlx::query("INSERT INTO events(id, work_item_id, run_id, occurred_at, kind, payload) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(EventId::new().to_string()).bind(work_id.to_string()).bind(run_id.map(|id| id.to_string()))
        .bind(at.unix_millis()).bind(envelope.kind).bind(serde_json::to_string(&envelope.payload).map_err(persistence)?)
        .execute(connection).await.map_err(sql_error)?;
    Ok(())
}

fn changed(rows: u64) -> Result<(), RepositoryError> {
    if rows != 1 {
        return Err(RepositoryError::Conflict(
            "The execution is no longer in the expected state.",
        ));
    }
    Ok(())
}

async fn run_work(
    connection: &mut SqliteConnection,
    id: RunId,
) -> Result<WorkItemId, RepositoryError> {
    let id: String = sqlx::query_scalar("SELECT work_item_id FROM runs WHERE id = ?")
        .bind(id.to_string())
        .fetch_optional(connection)
        .await
        .map_err(sql_error)?
        .ok_or(RepositoryError::NotFound("Run"))?;
    id.parse().map_err(persistence)
}

async fn touch(
    connection: &mut SqliteConnection,
    id: WorkItemId,
    at: Timestamp,
) -> Result<(), RepositoryError> {
    let rows = sqlx::query("UPDATE work_items SET updated_at = MAX(updated_at, ?) WHERE id = ?")
        .bind(at.unix_millis())
        .bind(id.to_string())
        .execute(connection)
        .await
        .map_err(sql_error)?
        .rows_affected();
    if rows != 1 {
        return Err(RepositoryError::NotFound("Work"));
    }
    Ok(())
}

async fn load_execution_state(
    transaction: &mut Transaction<'_, Sqlite>,
    run: Run,
) -> Result<RunExecutionState, RepositoryError> {
    let plan = sqlx::query_as::<_, PlanRecord>("SELECT id, run_id, revision_number, created_at FROM execution_plan_revisions WHERE run_id = ? ORDER BY revision_number DESC LIMIT 1")
        .bind(run.id.to_string()).fetch_one(&mut **transaction).await.map_err(sql_error)?;
    let stages = sqlx::query_as::<_, StagePlanRecord>("SELECT position, stage_kind FROM stage_plans WHERE execution_plan_revision_id = ? ORDER BY position")
        .bind(&plan.id).fetch_all(&mut **transaction).await.map_err(sql_error)?
        .into_iter().map(TryInto::try_into).collect::<Result<_, _>>()?;
    let plan = plan.into_domain(stages)?;
    let stages = sqlx::query_as::<_, StageRecord>("SELECT id, run_id, execution_plan_revision_id, stage_kind, status, started_at, completed_at, simulation_summary, failure FROM stage_executions WHERE run_id = ? ORDER BY started_at, id")
        .bind(run.id.to_string()).fetch_all(&mut **transaction).await.map_err(sql_error)?
        .into_iter().map(TryInto::try_into).collect::<Result<_, _>>()?;
    Ok(RunExecutionState { run, plan, stages })
}

impl WorkRepository for Database {
    async fn create_work(&self, work: &WorkItem) -> Result<(), RepositoryError> {
        let mut transaction = self.pool.begin().await.map_err(sql_error)?;
        sqlx::query("INSERT INTO work_items(id, title, objective, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
            .bind(work.id.to_string()).bind(&work.title).bind(&work.objective).bind(work.created_at.unix_millis()).bind(work.updated_at.unix_millis())
            .execute(&mut *transaction).await.map_err(sql_error)?;
        append_event(
            &mut transaction,
            work.id,
            None,
            work.created_at,
            EventKind::WorkCreated {
                title: work.title.clone(),
            },
        )
        .await?;
        transaction.commit().await.map_err(sql_error)
    }

    async fn list_work(&self) -> Result<Vec<WorkSummary>, RepositoryError> {
        let mut transaction = self.pool.begin().await.map_err(sql_error)?;
        let work = sqlx::query_as::<_, WorkRecord>("SELECT id, title, objective, created_at, updated_at FROM work_items ORDER BY updated_at DESC, id DESC")
            .fetch_all(&mut *transaction).await.map_err(sql_error)?;
        let mut summaries = Vec::with_capacity(work.len());
        for row in work {
            let latest_run = sqlx::query_as::<_, RunRecord>("SELECT id, work_item_id, status, created_at, started_at, completed_at FROM runs WHERE work_item_id = ? ORDER BY created_at DESC, id DESC LIMIT 1")
                .bind(&row.id).fetch_optional(&mut *transaction).await.map_err(sql_error)?
                .map(TryInto::try_into).transpose()?;
            summaries.push(WorkSummary {
                work: row.try_into()?,
                latest_run,
            });
        }
        transaction.commit().await.map_err(sql_error)?;
        Ok(summaries)
    }

    async fn get_work_detail(&self, id: WorkItemId) -> Result<WorkDetail, RepositoryError> {
        // One read transaction prevents a projection mixing pre/post-transition rows.
        let mut transaction = self.pool.begin().await.map_err(sql_error)?;
        let work = sqlx::query_as::<_, WorkRecord>(
            "SELECT id, title, objective, created_at, updated_at FROM work_items WHERE id = ?",
        )
        .bind(id.to_string())
        .fetch_optional(&mut *transaction)
        .await
        .map_err(sql_error)?
        .ok_or(RepositoryError::NotFound("Work"))?
        .try_into()?;
        let rows = sqlx::query_as::<_, RunRecord>("SELECT id, work_item_id, status, created_at, started_at, completed_at FROM runs WHERE work_item_id = ? ORDER BY created_at DESC, id DESC")
            .bind(id.to_string()).fetch_all(&mut *transaction).await.map_err(sql_error)?;
        let mut runs = Vec::with_capacity(rows.len());
        for row in rows {
            let state = load_execution_state(&mut transaction, row.try_into()?).await?;
            let events = sqlx::query_as::<_, EventRecord>("SELECT id, sequence, work_item_id, run_id, occurred_at, kind, payload FROM events WHERE run_id = ? ORDER BY sequence")
                .bind(state.run.id.to_string()).fetch_all(&mut *transaction).await.map_err(sql_error)?
                .into_iter().map(TryInto::try_into).collect::<Result<_, _>>()?;
            runs.push(RunDetail {
                run: state.run,
                plan: state.plan,
                stages: state.stages,
                events,
            });
        }
        let events = sqlx::query_as::<_, EventRecord>("SELECT id, sequence, work_item_id, run_id, occurred_at, kind, payload FROM events WHERE work_item_id = ? AND run_id IS NULL ORDER BY sequence")
            .bind(id.to_string()).fetch_all(&mut *transaction).await.map_err(sql_error)?
            .into_iter().map(TryInto::try_into).collect::<Result<_, _>>()?;
        transaction.commit().await.map_err(sql_error)?;
        Ok(WorkDetail { work, runs, events })
    }

    async fn get_run_execution_state(
        &self,
        work_item_id: WorkItemId,
        run_id: RunId,
    ) -> Result<RunExecutionState, RepositoryError> {
        let mut transaction = self.pool.begin().await.map_err(sql_error)?;
        let run = sqlx::query_as::<_, RunRecord>("SELECT id, work_item_id, status, created_at, started_at, completed_at FROM runs WHERE id = ? AND work_item_id = ?")
            .bind(run_id.to_string()).bind(work_item_id.to_string())
            .fetch_optional(&mut *transaction).await.map_err(sql_error)?
            .ok_or(RepositoryError::NotFound("Run"))?.try_into()?;
        let state = load_execution_state(&mut transaction, run).await?;
        transaction.commit().await.map_err(sql_error)?;
        Ok(state)
    }

    async fn create_run(
        &self,
        run: &Run,
        plan: &ExecutionPlanRevision,
    ) -> Result<(), RepositoryError> {
        if run.status != RunStatus::Running || plan.run_id != run.id || plan.stages.is_empty() {
            return Err(RepositoryError::Conflict(
                "A new Run requires a running state and a nonempty matching plan.",
            ));
        }
        let mut transaction = self.pool.begin().await.map_err(sql_error)?;
        touch(&mut transaction, run.work_item_id, run.created_at).await?;
        sqlx::query("INSERT INTO runs(id, work_item_id, status, created_at, started_at) VALUES (?, ?, ?, ?, ?)")
            .bind(run.id.to_string()).bind(run.work_item_id.to_string()).bind(name(&run.status)?).bind(run.created_at.unix_millis()).bind(run.started_at.unix_millis())
            .execute(&mut *transaction).await.map_err(sql_error)?;
        sqlx::query("INSERT INTO execution_plan_revisions(id, run_id, revision_number, created_at) VALUES (?, ?, ?, ?)")
            .bind(plan.id.to_string()).bind(run.id.to_string()).bind(i64::from(plan.revision_number)).bind(plan.created_at.unix_millis())
            .execute(&mut *transaction).await.map_err(sql_error)?;
        for stage in &plan.stages {
            sqlx::query("INSERT INTO stage_plans(execution_plan_revision_id, position, stage_kind) VALUES (?, ?, ?)")
                .bind(plan.id.to_string()).bind(i64::from(stage.position)).bind(name(&stage.stage_kind)?)
                .execute(&mut *transaction).await.map_err(sql_error)?;
        }
        append_event(
            &mut transaction,
            run.work_item_id,
            Some(run.id),
            run.created_at,
            EventKind::RunCreated {
                execution_plan_revision_id: plan.id,
            },
        )
        .await?;
        append_event(
            &mut transaction,
            run.work_item_id,
            Some(run.id),
            run.started_at,
            EventKind::RunStarted {},
        )
        .await?;
        transaction.commit().await.map_err(sql_error)
    }

    async fn begin_stage(&self, stage: &StageExecution) -> Result<(), RepositoryError> {
        if stage.status != StageStatus::Running {
            return Err(RepositoryError::Conflict("A stage must start Running."));
        }
        let mut transaction = self.pool.begin().await.map_err(sql_error)?;
        let rows = sqlx::query("INSERT INTO stage_executions(id, run_id, execution_plan_revision_id, stage_kind, status, started_at)
            SELECT ?, r.id, p.execution_plan_revision_id, p.stage_kind, 'running', ?
            FROM runs r JOIN execution_plan_revisions rev ON rev.run_id = r.id JOIN stage_plans p ON p.execution_plan_revision_id = rev.id
            WHERE r.id = ? AND rev.id = ? AND p.stage_kind = ? AND r.status = 'running'
            AND NOT EXISTS (SELECT 1 FROM stage_executions s WHERE s.run_id = r.id AND s.status != 'completed')
            AND p.position = (SELECT COUNT(*) FROM stage_executions s WHERE s.execution_plan_revision_id = rev.id AND s.status = 'completed')")
            .bind(stage.id.to_string()).bind(stage.started_at.unix_millis()).bind(stage.run_id.to_string()).bind(stage.execution_plan_revision_id.to_string()).bind(name(&stage.stage_kind)?)
            .execute(&mut *transaction).await.map_err(sql_error)?.rows_affected();
        changed(rows)?;
        let work = run_work(&mut transaction, stage.run_id).await?;
        touch(&mut transaction, work, stage.started_at).await?;
        append_event(
            &mut transaction,
            work,
            Some(stage.run_id),
            stage.started_at,
            EventKind::StageStarted {
                stage_execution_id: stage.id,
                stage_kind: stage.stage_kind,
            },
        )
        .await?;
        transaction.commit().await.map_err(sql_error)
    }

    async fn save_stage_outcome(
        &self,
        stage: &StageExecution,
        failed_run: Option<&Run>,
    ) -> Result<(), RepositoryError> {
        let at = stage.completed_at.ok_or(RepositoryError::Conflict(
            "Stage outcome requires a completion timestamp.",
        ))?;
        let kind = match (stage.status, failed_run) {
            (StageStatus::Completed, None) => EventKind::StageCompleted {
                stage_execution_id: stage.id,
                stage_kind: stage.stage_kind,
            },
            (StageStatus::Failed, Some(run))
                if run.id == stage.run_id
                    && run.status == RunStatus::Failed
                    && run.completed_at == Some(at) =>
            {
                EventKind::StageFailed {
                    stage_execution_id: stage.id,
                    stage_kind: stage.stage_kind,
                    message: stage.failure.clone().ok_or(RepositoryError::Conflict(
                        "Stage failure requires a safe message.",
                    ))?,
                }
            }
            _ => {
                return Err(RepositoryError::Conflict(
                    "Stage and Run outcomes are inconsistent.",
                ));
            }
        };
        let mut transaction = self.pool.begin().await.map_err(sql_error)?;
        let rows = sqlx::query("UPDATE stage_executions SET status = ?, completed_at = ?, simulation_summary = ?, failure = ?
            WHERE id = ? AND run_id = ? AND execution_plan_revision_id = ? AND stage_kind = ? AND status = 'running'
            AND EXISTS (SELECT 1 FROM runs r WHERE r.id = run_id AND r.status = 'running')")
            .bind(name(&stage.status)?).bind(at.unix_millis()).bind(stage.result.as_ref().map(|result| &result.summary)).bind(&stage.failure)
            .bind(stage.id.to_string()).bind(stage.run_id.to_string()).bind(stage.execution_plan_revision_id.to_string()).bind(name(&stage.stage_kind)?)
            .execute(&mut *transaction).await.map_err(sql_error)?.rows_affected();
        changed(rows)?;
        let work = run_work(&mut transaction, stage.run_id).await?;
        touch(&mut transaction, work, at).await?;
        append_event(&mut transaction, work, Some(stage.run_id), at, kind).await?;
        if let Some(run) = failed_run {
            let rows = sqlx::query("UPDATE runs SET status = 'failed', completed_at = ? WHERE id = ? AND work_item_id = ? AND status = 'running'")
                .bind(at.unix_millis()).bind(run.id.to_string()).bind(run.work_item_id.to_string())
                .execute(&mut *transaction).await.map_err(sql_error)?.rows_affected();
            changed(rows)?;
            append_event(
                &mut transaction,
                work,
                Some(run.id),
                at,
                EventKind::RunFailed {
                    message: "Deterministic stage simulation failed.".to_owned(),
                },
            )
            .await?;
        }
        transaction.commit().await.map_err(sql_error)
    }

    async fn complete_run(&self, run: &Run) -> Result<(), RepositoryError> {
        let at = run.completed_at.ok_or(RepositoryError::Conflict(
            "Run completion requires a timestamp.",
        ))?;
        if run.status != RunStatus::Completed {
            return Err(RepositoryError::Conflict("Run must be Completed."));
        }
        let mut transaction = self.pool.begin().await.map_err(sql_error)?;
        let rows = sqlx::query("UPDATE runs SET status = 'completed', completed_at = ? WHERE id = ? AND work_item_id = ? AND status = 'running'
            AND EXISTS (SELECT 1 FROM execution_plan_revisions rev WHERE rev.run_id = runs.id)
            AND NOT EXISTS (SELECT 1 FROM execution_plan_revisions rev JOIN stage_plans p ON p.execution_plan_revision_id = rev.id
                LEFT JOIN stage_executions s ON s.execution_plan_revision_id = rev.id AND s.stage_kind = p.stage_kind
                WHERE rev.run_id = runs.id AND (s.id IS NULL OR s.status != 'completed'))")
            .bind(at.unix_millis()).bind(run.id.to_string()).bind(run.work_item_id.to_string())
            .execute(&mut *transaction).await.map_err(sql_error)?.rows_affected();
        changed(rows)?;
        touch(&mut transaction, run.work_item_id, at).await?;
        append_event(
            &mut transaction,
            run.work_item_id,
            Some(run.id),
            at,
            EventKind::RunCompleted {},
        )
        .await?;
        transaction.commit().await.map_err(sql_error)
    }
}
