use serde::{Deserialize, Serialize};

use crate::{
    execution::StageKind,
    ids::{EventId, ExecutionPlanRevisionId, RunId, StageExecutionId, WorkItemId},
    work::Timestamp,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload", deny_unknown_fields)]
pub enum EventKind {
    #[serde(rename = "work.created")]
    WorkCreated { title: String },
    #[serde(rename = "run.created")]
    RunCreated {
        execution_plan_revision_id: ExecutionPlanRevisionId,
    },
    #[serde(rename = "run.started")]
    RunStarted {},
    #[serde(rename = "stage.started")]
    StageStarted {
        stage_execution_id: StageExecutionId,
        stage_kind: StageKind,
    },
    #[serde(rename = "stage.completed")]
    StageCompleted {
        stage_execution_id: StageExecutionId,
        stage_kind: StageKind,
    },
    #[serde(rename = "stage.failed")]
    StageFailed {
        stage_execution_id: StageExecutionId,
        stage_kind: StageKind,
        message: String,
    },
    #[serde(rename = "run.failed")]
    RunFailed { message: String },
    #[serde(rename = "run.completed")]
    RunCompleted {},
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Event {
    pub id: EventId,
    pub sequence: i64,
    pub work_item_id: WorkItemId,
    pub run_id: Option<RunId>,
    pub occurred_at: Timestamp,
    pub kind: EventKind,
}
