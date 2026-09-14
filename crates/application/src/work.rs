use std::{error::Error, future::Future};

use orynt_core::{
    event::Event,
    execution::{
        ExecutionPlanRevision, Run, RunStatus, SimulationResult, StageExecution, StageKind,
        StagePlan, StageStatus,
    },
    ids::{ExecutionPlanRevisionId, RunId, StageExecutionId, WorkItemId},
    work::{Timestamp, WorkError, WorkItem},
};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum RepositoryError {
    #[error("{0} was not found")]
    NotFound(&'static str),
    #[error("{0}")]
    Conflict(&'static str),
    #[error("durable work storage failed")]
    Persistence(#[source] Box<dyn Error + Send + Sync>),
}

#[derive(Debug, Error)]
#[error("stage execution failed: {message}")]
pub struct ExecutionError {
    // Adapter diagnostics stay internal; persisted/UI failures use safe application text.
    pub message: String,
}

#[derive(Debug, Error)]
pub enum ApplicationError {
    #[error(transparent)]
    Validation(#[from] WorkError),
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    Execution(#[from] ExecutionError),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkSummary {
    pub work: WorkItem,
    pub latest_run: Option<Run>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RunDetail {
    pub run: Run,
    pub plan: ExecutionPlanRevision,
    pub stages: Vec<StageExecution>,
    pub events: Vec<Event>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkDetail {
    pub work: WorkItem,
    pub runs: Vec<RunDetail>,
    pub events: Vec<Event>,
}

/// Each mutation commits its corresponding typed events atomically.
pub trait WorkRepository: Send + Sync {
    fn create_work(
        &self,
        work: &WorkItem,
    ) -> impl Future<Output = Result<(), RepositoryError>> + Send;
    fn list_work(&self) -> impl Future<Output = Result<Vec<WorkSummary>, RepositoryError>> + Send;
    fn get_work_detail(
        &self,
        id: WorkItemId,
    ) -> impl Future<Output = Result<WorkDetail, RepositoryError>> + Send;
    fn create_run(
        &self,
        run: &Run,
        plan: &ExecutionPlanRevision,
    ) -> impl Future<Output = Result<(), RepositoryError>> + Send;
    fn begin_stage(
        &self,
        stage: &StageExecution,
    ) -> impl Future<Output = Result<(), RepositoryError>> + Send;
    fn save_stage_outcome(
        &self,
        stage: &StageExecution,
        failed_run: Option<&Run>,
    ) -> impl Future<Output = Result<(), RepositoryError>> + Send;
    fn complete_run(&self, run: &Run) -> impl Future<Output = Result<(), RepositoryError>> + Send;
}

#[derive(Debug, Clone, Copy)]
pub struct StageInput {
    pub run_id: RunId,
    pub stage_execution_id: StageExecutionId,
    pub stage_kind: StageKind,
}

pub trait StageExecutor: Send + Sync {
    fn execute(
        &self,
        input: StageInput,
    ) -> impl Future<Output = Result<SimulationResult, ExecutionError>> + Send;
}

#[derive(Debug, Clone, Copy)]
pub struct RuntimeChange {
    pub work_item_id: WorkItemId,
    pub run_id: Option<RunId>,
}

/// A projection hint after commit, never a replacement for durable Event history.
/// Implementations must make delivery failures observable; consumers can refetch.
pub trait ChangeNotifier: Send + Sync {
    fn changed(&self, change: RuntimeChange);
}

pub struct WorkApplication<R, E, N> {
    repository: R,
    executor: E,
    notifier: N,
}

impl<R: WorkRepository, E: StageExecutor, N: ChangeNotifier> WorkApplication<R, E, N> {
    pub fn new(repository: R, executor: E, notifier: N) -> Self {
        Self {
            repository,
            executor,
            notifier,
        }
    }

    pub async fn create_work(
        &self,
        title: &str,
        objective: &str,
    ) -> Result<WorkItem, ApplicationError> {
        let work = WorkItem::new(title, objective, Timestamp::now()?)?;
        self.repository.create_work(&work).await?;
        self.notifier.changed(RuntimeChange {
            work_item_id: work.id,
            run_id: None,
        });
        Ok(work)
    }

    pub async fn list_work(&self) -> Result<Vec<WorkSummary>, ApplicationError> {
        Ok(self.repository.list_work().await?)
    }

    pub async fn get_work_detail(&self, id: WorkItemId) -> Result<WorkDetail, ApplicationError> {
        Ok(self.repository.get_work_detail(id).await?)
    }

    pub async fn start_simulated_run(
        &self,
        work_item_id: WorkItemId,
    ) -> Result<Run, ApplicationError> {
        let at = Timestamp::now()?;
        let run = Run {
            id: RunId::new(),
            work_item_id,
            status: RunStatus::Running,
            created_at: at,
            started_at: at,
            completed_at: None,
        };
        // The fixed M1 simulation plan is neither a Triage result nor an ExecutionPlanner.
        let stages = [
            StageKind::Triage,
            StageKind::Context,
            StageKind::Analysis,
            StageKind::Planning,
            StageKind::Implementation,
            StageKind::Verification,
            StageKind::Review,
            StageKind::Outcome,
        ];
        let plan = ExecutionPlanRevision {
            id: ExecutionPlanRevisionId::new(),
            run_id: run.id,
            revision_number: 1,
            created_at: at,
            stages: (0u32..)
                .zip(stages)
                .map(|(position, stage_kind)| StagePlan {
                    position,
                    stage_kind,
                })
                .collect(),
        };
        self.repository.create_run(&run, &plan).await?;
        self.notify(&run);
        Ok(run)
    }

    pub async fn execute_run_to_completion(
        &self,
        work_item_id: WorkItemId,
        run_id: RunId,
    ) -> Result<(), ApplicationError> {
        let detail = self.repository.get_work_detail(work_item_id).await?;
        let detail = detail
            .runs
            .into_iter()
            .find(|detail| detail.run.id == run_id)
            .ok_or(RepositoryError::NotFound("Run"))?;
        if detail.run.status != RunStatus::Running || !detail.stages.is_empty() {
            return Err(RepositoryError::Conflict(
                "Run execution has already started or finished.",
            )
            .into());
        }
        let mut run = detail.run;
        for planned in detail.plan.stages {
            let mut stage = StageExecution {
                id: StageExecutionId::new(),
                run_id: run.id,
                execution_plan_revision_id: detail.plan.id,
                stage_kind: planned.stage_kind,
                status: StageStatus::Running,
                started_at: Timestamp::now()?,
                completed_at: None,
                result: None,
                failure: None,
            };
            // Uniqueness/conditional writes also prevent two coordinators claiming a stage.
            self.repository.begin_stage(&stage).await?;
            self.notify(&run);
            let outcome = self
                .executor
                .execute(StageInput {
                    run_id: run.id,
                    stage_execution_id: stage.id,
                    stage_kind: stage.stage_kind,
                })
                .await;
            let at = Timestamp::now()?;
            stage.completed_at = Some(at);
            match outcome {
                Ok(result) => {
                    stage.status = StageStatus::Completed;
                    stage.result = Some(result);
                    self.repository.save_stage_outcome(&stage, None).await?;
                    self.notify(&run);
                }
                Err(error) => {
                    stage.status = StageStatus::Failed;
                    stage.failure = Some(
                        "Deterministic stage simulation failed. No AI or tool work was performed."
                            .to_owned(),
                    );
                    run.status = RunStatus::Failed;
                    run.completed_at = Some(at);
                    self.repository
                        .save_stage_outcome(&stage, Some(&run))
                        .await?;
                    self.notify(&run);
                    return Err(error.into());
                }
            }
        }
        run.status = RunStatus::Completed;
        run.completed_at = Some(Timestamp::now()?);
        self.repository.complete_run(&run).await?;
        self.notify(&run);
        Ok(())
    }

    fn notify(&self, run: &Run) {
        self.notifier.changed(RuntimeChange {
            work_item_id: run.work_item_id,
            run_id: Some(run.id),
        });
    }
}
