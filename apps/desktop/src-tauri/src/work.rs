use std::sync::Arc;

use orynt_application::work::{
    ApplicationError, ChangeNotifier, RepositoryError, RuntimeChange, WorkApplication,
};
use orynt_runtime::FakeStageExecutor;
use orynt_storage::Database;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, State};

mod dto;
use dto::{RunDto, WorkDetailDto, WorkItemDto, WorkSummaryDto};

pub(super) struct DesktopNotifier(tauri::AppHandle);
impl ChangeNotifier for DesktopNotifier {
    fn changed(&self, change: RuntimeChange) {
        let payload = RuntimeChangeDto {
            work_item_id: change.work_item_id.to_string(),
            run_id: change.run_id.map(|id| id.to_string()),
        };
        if let Err(error) = self.0.emit_to("main", "runtime-change", payload) {
            tracing::error!(error = ?error, "Committed runtime change notification could not be delivered");
        }
    }
}

#[derive(Clone, Serialize)]
struct RuntimeChangeDto {
    work_item_id: String,
    run_id: Option<String>,
}

type WorkState = Arc<WorkApplication<Database, FakeStageExecutor, DesktopNotifier>>;

pub(super) fn compose(database: Database, app: tauri::AppHandle) -> WorkState {
    Arc::new(WorkApplication::new(
        database,
        FakeStageExecutor,
        DesktopNotifier(app),
    ))
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum ErrorCode {
    Validation,
    NotFound,
    Conflict,
    Persistence,
    Execution,
}

#[derive(Debug, Serialize)]
pub(super) struct CommandError {
    code: ErrorCode,
    message: String,
}

impl CommandError {
    fn invalid_id() -> Self {
        Self {
            code: ErrorCode::Validation,
            message: "Select a valid Work item.".to_owned(),
        }
    }
}

impl From<ApplicationError> for CommandError {
    fn from(error: ApplicationError) -> Self {
        tracing::error!(error = ?error, "Work command failed");
        let (code, message) = match error {
            ApplicationError::Validation(error) => (ErrorCode::Validation, error.to_string()),
            ApplicationError::Repository(RepositoryError::NotFound(_)) => (ErrorCode::NotFound, "The requested Work or Run was not found.".to_owned()),
            ApplicationError::Repository(RepositoryError::Conflict(message)) => (ErrorCode::Conflict, message.to_owned()),
            ApplicationError::Repository(RepositoryError::Persistence(_)) => (ErrorCode::Persistence, "Orynt could not read or save local work. Try again; inspect the runtime output if this continues.".to_owned()),
            ApplicationError::Execution(_) => (ErrorCode::Execution, "The deterministic simulation failed. Inspect the Run history.".to_owned()),
        };
        Self { code, message }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct CreateWorkRequest {
    title: String,
    objective: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct WorkRequest {
    work_item_id: String,
}

#[tauri::command]
pub(super) async fn create_work(
    application: State<'_, WorkState>,
    request: CreateWorkRequest,
) -> Result<WorkItemDto, CommandError> {
    Ok(application
        .create_work(&request.title, &request.objective)
        .await?
        .into())
}

#[tauri::command]
pub(super) async fn list_work(
    application: State<'_, WorkState>,
) -> Result<Vec<WorkSummaryDto>, CommandError> {
    Ok(application
        .list_work()
        .await?
        .into_iter()
        .map(Into::into)
        .collect())
}

#[tauri::command]
pub(super) async fn get_work_detail(
    application: State<'_, WorkState>,
    request: WorkRequest,
) -> Result<WorkDetailDto, CommandError> {
    let id = request
        .work_item_id
        .parse()
        .map_err(|_| CommandError::invalid_id())?;
    Ok(application.get_work_detail(id).await?.into())
}

#[tauri::command]
pub(super) async fn start_simulated_run(
    application: State<'_, WorkState>,
    request: WorkRequest,
) -> Result<RunDto, CommandError> {
    let id = request
        .work_item_id
        .parse()
        .map_err(|_| CommandError::invalid_id())?;
    let run = application.start_simulated_run(id).await?;
    let application = Arc::clone(application.inner());
    let run_id = run.id;
    tauri::async_runtime::spawn(async move {
        if let Err(error) = application.execute_run_to_completion(id, run_id).await {
            tracing::error!(error = ?error, %run_id, "Background simulated execution failed");
        }
    });
    Ok(run.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_errors_keep_diagnostics_internal() {
        let error = CommandError::from(ApplicationError::Repository(RepositoryError::Persistence(
            Box::new(std::io::Error::other("private database path")),
        )));
        assert_eq!(error.code, ErrorCode::Persistence);
        assert!(!error.message.contains("private database path"));
        assert_eq!(
            CommandError::from(ApplicationError::Repository(RepositoryError::NotFound(
                "Run"
            )))
            .code,
            ErrorCode::NotFound
        );
        assert_eq!(
            CommandError::from(ApplicationError::Repository(RepositoryError::Conflict(
                "Already finished."
            )))
            .code,
            ErrorCode::Conflict
        );
    }
}
