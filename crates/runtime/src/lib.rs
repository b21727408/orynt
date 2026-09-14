//! In-process deterministic simulation; no AI, filesystem, process or network access.

use std::time::Duration;

use orynt_application::work::{ExecutionError, StageExecutor, StageInput};
use orynt_core::execution::SimulationResult;

pub struct FakeStageExecutor;

impl StageExecutor for FakeStageExecutor {
    async fn execute(&self, input: StageInput) -> Result<SimulationResult, ExecutionError> {
        tokio::time::sleep(Duration::from_millis(650)).await;
        Ok(SimulationResult {
            summary: format!(
                "Milestone 1 simulation completed the {:?} stage. No AI, repository analysis, code changes, tests, verification or review were performed.",
                input.stage_kind
            ),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use orynt_core::{
        execution::StageKind,
        ids::{RunId, StageExecutionId},
    };

    #[tokio::test(start_paused = true)]
    async fn fake_execution_waits_asynchronously_and_returns_only_deterministic_simulation()
    -> Result<(), ExecutionError> {
        let input = StageInput {
            run_id: RunId::new(),
            stage_execution_id: StageExecutionId::new(),
            stage_kind: StageKind::Verification,
        };
        assert!(
            tokio::time::timeout(Duration::from_millis(649), FakeStageExecutor.execute(input))
                .await
                .is_err()
        );
        let started = tokio::time::Instant::now();
        let first = FakeStageExecutor.execute(input).await?;
        assert_eq!(started.elapsed(), Duration::from_millis(650));
        let second = FakeStageExecutor.execute(input).await?;
        assert_eq!(first, second);
        assert!(first.summary.contains("simulation"));
        assert!(first.summary.contains("No AI"));
        Ok(())
    }
}
