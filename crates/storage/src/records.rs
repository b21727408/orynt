//! Database rows and explicit mapping to canonical values; never exposed by IPC.
use orynt_application::work::RepositoryError;
use orynt_core::{
    event::{Event, EventKind},
    execution::{ExecutionPlanRevision, Run, SimulationResult, StageExecution, StagePlan},
    work::WorkItem,
};
use serde::{Serialize, de::DeserializeOwned};
use sqlx::FromRow;

pub(super) fn persistence(
    error: impl std::error::Error + Send + Sync + 'static,
) -> RepositoryError {
    RepositoryError::Persistence(Box::new(error))
}

pub(super) fn sql_error(error: sqlx::Error) -> RepositoryError {
    if error
        .as_database_error()
        .is_some_and(|error| error.is_unique_violation())
    {
        RepositoryError::Conflict("This execution transition has already been recorded.")
    } else {
        persistence(error)
    }
}

pub(super) fn name(value: &impl Serialize) -> Result<String, RepositoryError> {
    let value = serde_json::to_value(value).map_err(persistence)?;
    serde_json::from_value(value).map_err(persistence)
}

pub(super) fn parse_name<T: DeserializeOwned>(value: String) -> Result<T, RepositoryError> {
    serde_json::from_value(serde_json::Value::String(value)).map_err(persistence)
}

#[derive(FromRow)]
pub(super) struct WorkRecord {
    pub id: String,
    pub title: String,
    pub objective: String,
    pub created_at: i64,
    pub updated_at: i64,
}
impl TryFrom<WorkRecord> for WorkItem {
    type Error = RepositoryError;
    fn try_from(row: WorkRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id.parse().map_err(persistence)?,
            title: row.title,
            objective: row.objective,
            created_at: row.created_at.try_into().map_err(persistence)?,
            updated_at: row.updated_at.try_into().map_err(persistence)?,
        })
    }
}

#[derive(FromRow)]
pub(super) struct RunRecord {
    pub id: String,
    pub work_item_id: String,
    pub status: String,
    pub created_at: i64,
    pub started_at: i64,
    pub completed_at: Option<i64>,
}
impl TryFrom<RunRecord> for Run {
    type Error = RepositoryError;
    fn try_from(row: RunRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id.parse().map_err(persistence)?,
            work_item_id: row.work_item_id.parse().map_err(persistence)?,
            status: parse_name(row.status)?,
            created_at: row.created_at.try_into().map_err(persistence)?,
            started_at: row.started_at.try_into().map_err(persistence)?,
            completed_at: row
                .completed_at
                .map(TryInto::try_into)
                .transpose()
                .map_err(persistence)?,
        })
    }
}

#[derive(FromRow)]
pub(super) struct PlanRecord {
    pub id: String,
    pub run_id: String,
    pub revision_number: i64,
    pub created_at: i64,
}
impl PlanRecord {
    pub fn into_domain(
        self,
        stages: Vec<StagePlan>,
    ) -> Result<ExecutionPlanRevision, RepositoryError> {
        Ok(ExecutionPlanRevision {
            id: self.id.parse().map_err(persistence)?,
            run_id: self.run_id.parse().map_err(persistence)?,
            revision_number: self.revision_number.try_into().map_err(persistence)?,
            created_at: self.created_at.try_into().map_err(persistence)?,
            stages,
        })
    }
}

#[derive(FromRow)]
pub(super) struct StagePlanRecord {
    pub position: i64,
    pub stage_kind: String,
}
impl TryFrom<StagePlanRecord> for StagePlan {
    type Error = RepositoryError;
    fn try_from(row: StagePlanRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            position: row.position.try_into().map_err(persistence)?,
            stage_kind: parse_name(row.stage_kind)?,
        })
    }
}

#[derive(FromRow)]
pub(super) struct StageRecord {
    pub id: String,
    pub run_id: String,
    pub execution_plan_revision_id: String,
    pub stage_kind: String,
    pub status: String,
    pub started_at: i64,
    pub completed_at: Option<i64>,
    pub simulation_summary: Option<String>,
    pub failure: Option<String>,
}
impl TryFrom<StageRecord> for StageExecution {
    type Error = RepositoryError;
    fn try_from(row: StageRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id.parse().map_err(persistence)?,
            run_id: row.run_id.parse().map_err(persistence)?,
            execution_plan_revision_id: row
                .execution_plan_revision_id
                .parse()
                .map_err(persistence)?,
            stage_kind: parse_name(row.stage_kind)?,
            status: parse_name(row.status)?,
            started_at: row.started_at.try_into().map_err(persistence)?,
            completed_at: row
                .completed_at
                .map(TryInto::try_into)
                .transpose()
                .map_err(persistence)?,
            result: row
                .simulation_summary
                .map(|summary| SimulationResult { summary }),
            failure: row.failure,
        })
    }
}

#[derive(FromRow)]
pub(super) struct EventRecord {
    pub id: String,
    pub sequence: i64,
    pub work_item_id: String,
    pub run_id: Option<String>,
    pub occurred_at: i64,
    pub kind: String,
    pub payload: String,
}
impl TryFrom<EventRecord> for Event {
    type Error = RepositoryError;
    fn try_from(row: EventRecord) -> Result<Self, Self::Error> {
        let payload: serde_json::Value = serde_json::from_str(&row.payload).map_err(persistence)?;
        let kind: EventKind =
            serde_json::from_value(serde_json::json!({"type": row.kind, "payload": payload}))
                .map_err(persistence)?;
        Ok(Self {
            id: row.id.parse().map_err(persistence)?,
            sequence: row.sequence,
            work_item_id: row.work_item_id.parse().map_err(persistence)?,
            run_id: row
                .run_id
                .map(|id| id.parse())
                .transpose()
                .map_err(persistence)?,
            occurred_at: row.occurred_at.try_into().map_err(persistence)?,
            kind,
        })
    }
}
