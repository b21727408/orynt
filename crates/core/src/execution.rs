use serde::{Deserialize, Serialize};

use crate::{
    ids::{ExecutionPlanRevisionId, RunId, StageExecutionId, WorkItemId},
    work::Timestamp,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StageKind {
    Triage,
    Context,
    Analysis,
    Planning,
    Implementation,
    Verification,
    Review,
    Outcome,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Running,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StageStatus {
    Running,
    Completed,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Run {
    pub id: RunId,
    pub work_item_id: WorkItemId,
    pub status: RunStatus,
    pub created_at: Timestamp,
    pub started_at: Timestamp,
    pub completed_at: Option<Timestamp>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExecutionPlanRevision {
    pub id: ExecutionPlanRevisionId,
    pub run_id: RunId,
    pub revision_number: u32,
    pub created_at: Timestamp,
    pub stages: Vec<StagePlan>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StagePlan {
    pub position: u32,
    pub stage_kind: StageKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SimulationResult {
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StageExecution {
    pub id: StageExecutionId,
    pub run_id: RunId,
    pub execution_plan_revision_id: ExecutionPlanRevisionId,
    pub stage_kind: StageKind,
    pub status: StageStatus,
    pub started_at: Timestamp,
    pub completed_at: Option<Timestamp>,
    pub result: Option<SimulationResult>,
    pub failure: Option<String>,
}
