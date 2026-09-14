use orynt_application::work::{RunDetail, WorkDetail, WorkSummary};
use orynt_core::{
    event::{Event, EventKind},
    execution::{ExecutionPlanRevision, Run, RunStatus, StageExecution, StageKind, StageStatus},
    work::WorkItem,
};
use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct WorkItemDto {
    id: String,
    title: String,
    objective: String,
    created_at: i64,
    updated_at: i64,
}
impl From<WorkItem> for WorkItemDto {
    fn from(work: WorkItem) -> Self {
        Self {
            id: work.id.to_string(),
            title: work.title,
            objective: work.objective,
            created_at: work.created_at.unix_millis(),
            updated_at: work.updated_at.unix_millis(),
        }
    }
}

#[derive(Serialize)]
pub(crate) struct RunDto {
    id: String,
    work_item_id: String,
    status: RunStatus,
    created_at: i64,
    started_at: i64,
    completed_at: Option<i64>,
}
impl From<Run> for RunDto {
    fn from(run: Run) -> Self {
        Self {
            id: run.id.to_string(),
            work_item_id: run.work_item_id.to_string(),
            status: run.status,
            created_at: run.created_at.unix_millis(),
            started_at: run.started_at.unix_millis(),
            completed_at: run.completed_at.map(|at| at.unix_millis()),
        }
    }
}

#[derive(Serialize)]
struct StagePlanDto {
    position: u32,
    stage_kind: StageKind,
}
#[derive(Serialize)]
struct PlanDto {
    id: String,
    run_id: String,
    revision_number: u32,
    created_at: i64,
    stages: Vec<StagePlanDto>,
}
impl From<ExecutionPlanRevision> for PlanDto {
    fn from(plan: ExecutionPlanRevision) -> Self {
        Self {
            id: plan.id.to_string(),
            run_id: plan.run_id.to_string(),
            revision_number: plan.revision_number,
            created_at: plan.created_at.unix_millis(),
            stages: plan
                .stages
                .into_iter()
                .map(|stage| StagePlanDto {
                    position: stage.position,
                    stage_kind: stage.stage_kind,
                })
                .collect(),
        }
    }
}

#[derive(Serialize)]
struct SimulationResultDto {
    kind: &'static str,
    summary: String,
}
#[derive(Serialize)]
struct StageDto {
    id: String,
    run_id: String,
    execution_plan_revision_id: String,
    stage_kind: StageKind,
    status: StageStatus,
    started_at: i64,
    completed_at: Option<i64>,
    result: Option<SimulationResultDto>,
    failure: Option<String>,
}
impl From<StageExecution> for StageDto {
    fn from(stage: StageExecution) -> Self {
        Self {
            id: stage.id.to_string(),
            run_id: stage.run_id.to_string(),
            execution_plan_revision_id: stage.execution_plan_revision_id.to_string(),
            stage_kind: stage.stage_kind,
            status: stage.status,
            started_at: stage.started_at.unix_millis(),
            completed_at: stage.completed_at.map(|at| at.unix_millis()),
            result: stage.result.map(|result| SimulationResultDto {
                kind: "simulation",
                summary: result.summary,
            }),
            failure: stage.failure,
        }
    }
}

#[derive(Serialize)]
struct EventDto {
    id: String,
    sequence: i64,
    work_item_id: String,
    run_id: Option<String>,
    occurred_at: i64,
    kind: EventKind,
}
impl From<Event> for EventDto {
    fn from(event: Event) -> Self {
        Self {
            id: event.id.to_string(),
            sequence: event.sequence,
            work_item_id: event.work_item_id.to_string(),
            run_id: event.run_id.map(|id| id.to_string()),
            occurred_at: event.occurred_at.unix_millis(),
            kind: event.kind,
        }
    }
}

#[derive(Serialize)]
struct RunDetailDto {
    run: RunDto,
    plan: PlanDto,
    stages: Vec<StageDto>,
    events: Vec<EventDto>,
}
impl From<RunDetail> for RunDetailDto {
    fn from(detail: RunDetail) -> Self {
        Self {
            run: detail.run.into(),
            plan: detail.plan.into(),
            stages: detail.stages.into_iter().map(Into::into).collect(),
            events: detail.events.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Serialize)]
pub(crate) struct WorkDetailDto {
    work: WorkItemDto,
    runs: Vec<RunDetailDto>,
    events: Vec<EventDto>,
}
impl From<WorkDetail> for WorkDetailDto {
    fn from(detail: WorkDetail) -> Self {
        Self {
            work: detail.work.into(),
            runs: detail.runs.into_iter().map(Into::into).collect(),
            events: detail.events.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Serialize)]
pub(crate) struct WorkSummaryDto {
    work: WorkItemDto,
    latest_run: Option<RunDto>,
}
impl From<WorkSummary> for WorkSummaryDto {
    fn from(summary: WorkSummary) -> Self {
        Self {
            work: summary.work.into(),
            latest_run: summary.latest_run.map(Into::into),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use orynt_core::{
        execution::{SimulationResult, StagePlan},
        ids::{EventId, ExecutionPlanRevisionId, RunId, StageExecutionId},
        work::Timestamp,
    };
    use serde_json::json;

    #[test]
    fn serializes_the_renderer_contract_without_storage_records()
    -> Result<(), Box<dyn std::error::Error>> {
        let at = Timestamp::try_from(1_000)?;
        let work = WorkItem::new("Contract", "Simulation only", at)?;
        let run = Run {
            id: RunId::new(),
            work_item_id: work.id,
            status: RunStatus::Completed,
            created_at: at,
            started_at: at,
            completed_at: Some(at),
        };
        let plan = ExecutionPlanRevision {
            id: ExecutionPlanRevisionId::new(),
            run_id: run.id,
            revision_number: 1,
            created_at: at,
            stages: vec![StagePlan {
                position: 0,
                stage_kind: StageKind::Planning,
            }],
        };
        let stage = StageExecution {
            id: StageExecutionId::new(),
            run_id: run.id,
            execution_plan_revision_id: plan.id,
            stage_kind: StageKind::Planning,
            status: StageStatus::Completed,
            started_at: at,
            completed_at: Some(at),
            result: Some(SimulationResult {
                summary: "Simulation only".to_owned(),
            }),
            failure: None,
        };
        let stage_id = stage.id;
        let events = vec![Event {
            id: EventId::new(),
            sequence: 1,
            work_item_id: work.id,
            run_id: Some(run.id),
            occurred_at: at,
            kind: EventKind::StageCompleted {
                stage_execution_id: stage.id,
                stage_kind: stage.stage_kind,
            },
        }];
        let list = serde_json::to_value(vec![WorkSummaryDto::from(WorkSummary {
            work: work.clone(),
            latest_run: Some(run.clone()),
        })])?;
        assert_eq!(
            list[0]["work"],
            json!({ "id": work.id.to_string(), "title": "Contract", "objective": "Simulation only", "created_at": 1000, "updated_at": 1000 })
        );
        assert_eq!(
            list[0]["latest_run"],
            json!({ "id": run.id.to_string(), "work_item_id": work.id.to_string(), "status": "completed", "created_at": 1000, "started_at": 1000, "completed_at": 1000 })
        );
        let detail = serde_json::to_value(WorkDetailDto::from(WorkDetail {
            work,
            runs: vec![RunDetail {
                run,
                plan,
                stages: vec![stage],
                events,
            }],
            events: vec![],
        }))?;
        assert_eq!(
            detail["runs"][0]["plan"]["stages"],
            json!([{ "position": 0, "stage_kind": "planning" }])
        );
        assert_eq!(
            detail["runs"][0]["stages"][0]["result"],
            json!({ "kind": "simulation", "summary": "Simulation only" })
        );
        assert_eq!(
            detail["runs"][0]["events"][0]["kind"],
            json!({ "type": "stage.completed", "payload": { "stage_execution_id": stage_id.to_string(), "stage_kind": "planning" } })
        );
        Ok(())
    }
}
