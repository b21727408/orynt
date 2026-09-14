use std::sync::{Arc, Mutex};

use orynt_application::work::{
    ApplicationError, ChangeNotifier, ExecutionError, RuntimeChange, StageExecutor, StageInput,
    WorkApplication,
};
use orynt_core::execution::{SimulationResult, StageKind};
use sqlx::sqlite::SqliteConnectOptions;

use super::*;

type TestResult = Result<(), Box<dyn std::error::Error>>;

struct Immediate {
    fail: Option<StageKind>,
}
impl StageExecutor for Immediate {
    async fn execute(&self, input: StageInput) -> Result<SimulationResult, ExecutionError> {
        if self.fail == Some(input.stage_kind) {
            return Err(ExecutionError {
                message: "test-only private diagnostic".to_owned(),
            });
        }
        Ok(SimulationResult {
            summary: format!("Deterministic test simulation: {:?}.", input.stage_kind),
        })
    }
}

#[derive(Clone, Default)]
struct Notifications(Arc<Mutex<Vec<RuntimeChange>>>);
impl ChangeNotifier for Notifications {
    fn changed(&self, change: RuntimeChange) {
        self.0.lock().expect("test recorder lock").push(change);
    }
}

fn application(
    database: &Database,
    fail: Option<StageKind>,
) -> WorkApplication<Database, Immediate, Notifications> {
    WorkApplication::new(
        database.clone(),
        Immediate { fail },
        Notifications::default(),
    )
}

async fn memory() -> Result<Database, crate::StorageError> {
    Database::connect(SqliteConnectOptions::new().in_memory(true)).await
}

#[tokio::test]
async fn manual_work_survives_storage_and_application_recreation() -> TestResult {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("work.sqlite3");
    let database = Database::open(&path).await?;
    let app = application(&database, None);
    let work = app.create_work("  Durable work  ", "An objective").await?;
    let before = app.get_work_detail(work.id).await?;
    assert!(before.runs.is_empty());
    assert_eq!(before.events.len(), 1);
    assert!(matches!(
        before.events[0].kind,
        EventKind::WorkCreated { .. }
    ));
    drop(app);
    database.close().await;
    let reopened = Database::open(&path).await?;
    assert_eq!(
        application(&reopened, None)
            .get_work_detail(work.id)
            .await?,
        before
    );
    reopened.close().await;
    Ok(())
}

#[tokio::test]
async fn complete_plan_and_two_separate_histories_survive_reopen() -> TestResult {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("history.sqlite3");
    let database = Database::open(&path).await?;
    let app = application(&database, None);
    let work = app.create_work("History", "Simulation only").await?;
    let first = app.start_simulated_run(work.id).await?;
    let started = app.get_work_detail(work.id).await?;
    assert!(
        started.runs[0].stages.is_empty(),
        "planned work is not an execution"
    );
    assert_eq!(started.runs[0].plan.revision_number, 1);
    assert_eq!(
        started.runs[0]
            .plan
            .stages
            .iter()
            .map(|stage| stage.stage_kind)
            .collect::<Vec<_>>(),
        vec![
            StageKind::Triage,
            StageKind::Context,
            StageKind::Analysis,
            StageKind::Planning,
            StageKind::Implementation,
            StageKind::Verification,
            StageKind::Review,
            StageKind::Outcome
        ]
    );
    app.execute_run_to_completion(work.id, first.id).await?;
    let first_history = app.get_work_detail(work.id).await?.runs.remove(0);
    assert_eq!(first_history.run.status, RunStatus::Completed);
    assert_eq!(first_history.stages.len(), 8);
    assert!(
        first_history
            .stages
            .iter()
            .all(|stage| stage.status == StageStatus::Completed && stage.result.is_some())
    );
    assert_eq!(first_history.events.len(), 19);
    assert!(matches!(
        first_history.events[0].kind,
        EventKind::RunCreated { .. }
    ));
    assert!(matches!(
        first_history.events[1].kind,
        EventKind::RunStarted {}
    ));
    assert!(matches!(
        first_history.events[18].kind,
        EventKind::RunCompleted {}
    ));
    assert!(
        first_history
            .events
            .windows(2)
            .all(|pair| pair[0].sequence < pair[1].sequence)
    );
    for (index, stage) in first_history.stages.iter().enumerate() {
        assert_eq!(
            stage.stage_kind,
            first_history.plan.stages[index].stage_kind
        );
        assert_eq!(
            first_history.events[2 + index * 2].kind,
            EventKind::StageStarted {
                stage_execution_id: stage.id,
                stage_kind: stage.stage_kind
            }
        );
        assert_eq!(
            first_history.events[3 + index * 2].kind,
            EventKind::StageCompleted {
                stage_execution_id: stage.id,
                stage_kind: stage.stage_kind
            }
        );
    }
    let second = app.start_simulated_run(work.id).await?;
    assert_ne!(first.id, second.id);
    assert_eq!(app.get_work_detail(work.id).await?.runs[1], first_history);
    app.execute_run_to_completion(work.id, second.id).await?;
    let before = app.get_work_detail(work.id).await?;
    assert_eq!(before.runs[1], first_history);
    assert_ne!(before.runs[0].plan.id, before.runs[1].plan.id);
    assert_eq!(
        app.list_work().await?[0]
            .latest_run
            .as_ref()
            .map(|run| run.id),
        Some(second.id)
    );
    assert!(matches!(
        app.execute_run_to_completion(work.id, first.id).await,
        Err(ApplicationError::Repository(RepositoryError::Conflict(_)))
    ));
    drop(app);
    database.close().await;
    let reopened = Database::open(&path).await?;
    reopened.check_ready().await?;
    assert_eq!(
        application(&reopened, None)
            .get_work_detail(work.id)
            .await?,
        before
    );
    reopened.close().await;
    Ok(())
}

#[tokio::test]
async fn deterministic_failure_preserves_completed_stages_and_records_safe_failure() -> TestResult {
    let database = memory().await?;
    let app = application(&database, Some(StageKind::Analysis));
    let work = app.create_work("Failure", "").await?;
    let run = app.start_simulated_run(work.id).await?;
    assert!(matches!(
        app.execute_run_to_completion(work.id, run.id).await,
        Err(ApplicationError::Execution(_))
    ));
    let detail = app.get_work_detail(work.id).await?.runs.remove(0);
    assert_eq!(detail.run.status, RunStatus::Failed);
    assert_eq!(detail.stages.len(), 3);
    assert_eq!(detail.stages[0].status, StageStatus::Completed);
    assert_eq!(detail.stages[1].status, StageStatus::Completed);
    assert_eq!(detail.stages[2].status, StageStatus::Failed);
    assert!(detail.stages[2].result.is_none());
    assert!(
        !detail.stages[2]
            .failure
            .as_ref()
            .is_some_and(|text| text.contains("private"))
    );
    assert!(matches!(
        detail.events[7].kind,
        EventKind::StageFailed { .. }
    ));
    assert!(matches!(detail.events[8].kind, EventKind::RunFailed { .. }));
    Ok(())
}

async fn reject_event(database: &Database, kind: &str) -> Result<(), sqlx::Error> {
    sqlx::raw_sql("CREATE TEMP TABLE IF NOT EXISTS rejected_event_kind(kind TEXT NOT NULL); DELETE FROM rejected_event_kind;
        CREATE TEMP TRIGGER reject_event BEFORE INSERT ON events WHEN NEW.kind = (SELECT kind FROM rejected_event_kind)
        BEGIN SELECT RAISE(ABORT, 'injected event failure'); END;")
        .execute(&database.pool).await?;
    sqlx::query("INSERT INTO rejected_event_kind(kind) VALUES (?)")
        .bind(kind)
        .execute(&database.pool)
        .await?;
    Ok(())
}

#[tokio::test]
async fn work_and_run_creation_roll_back_when_history_cannot_be_appended() -> TestResult {
    let database = memory().await?;
    let notifications = Notifications::default();
    let app = WorkApplication::new(
        database.clone(),
        Immediate { fail: None },
        notifications.clone(),
    );
    reject_event(&database, "work.created").await?;
    assert!(app.create_work("Must roll back", "").await.is_err());
    assert!(app.list_work().await?.is_empty());
    assert!(
        notifications
            .0
            .lock()
            .expect("test recorder lock")
            .is_empty()
    );
    sqlx::query("DROP TRIGGER reject_event")
        .execute(&database.pool)
        .await?;
    let work = app.create_work("Retained", "").await?;
    let before = app.get_work_detail(work.id).await?;
    reject_event(&database, "run.started").await?;
    assert!(app.start_simulated_run(work.id).await.is_err());
    assert_eq!(app.get_work_detail(work.id).await?, before);
    assert_eq!(notifications.0.lock().expect("test recorder lock").len(), 1);
    let plans: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM execution_plan_revisions")
        .fetch_one(&database.pool)
        .await?;
    assert_eq!(plans, 0);
    Ok(())
}

#[tokio::test]
async fn stage_start_completion_and_run_completion_are_atomic_with_their_events() -> TestResult {
    for rejected in ["stage.started", "stage.completed", "run.completed"] {
        let database = memory().await?;
        let app = application(&database, None);
        let work = app.create_work("Atomic", "").await?;
        let run = app.start_simulated_run(work.id).await?;
        reject_event(&database, rejected).await?;
        assert!(matches!(
            app.execute_run_to_completion(work.id, run.id).await,
            Err(ApplicationError::Repository(RepositoryError::Persistence(
                _
            )))
        ));
        let detail = app.get_work_detail(work.id).await?.runs.remove(0);
        assert_eq!(detail.run.status, RunStatus::Running);
        match rejected {
            "stage.started" => {
                assert!(detail.stages.is_empty());
                assert_eq!(detail.events.len(), 2);
            }
            "stage.completed" => {
                assert_eq!(detail.stages.len(), 1);
                assert_eq!(detail.stages[0].status, StageStatus::Running);
                assert_eq!(detail.events.len(), 3);
            }
            "run.completed" => {
                assert!(
                    detail
                        .stages
                        .iter()
                        .all(|stage| stage.status == StageStatus::Completed)
                );
                assert_eq!(detail.events.len(), 18);
            }
            _ => unreachable!("test case"),
        }
    }
    Ok(())
}

#[tokio::test]
async fn failed_run_event_failure_rolls_back_both_failure_transitions() -> TestResult {
    let database = memory().await?;
    let app = application(&database, Some(StageKind::Analysis));
    let work = app.create_work("Atomic failure", "").await?;
    let run = app.start_simulated_run(work.id).await?;
    reject_event(&database, "run.failed").await?;
    assert!(
        app.execute_run_to_completion(work.id, run.id)
            .await
            .is_err()
    );
    let detail = app.get_work_detail(work.id).await?.runs.remove(0);
    assert_eq!(detail.run.status, RunStatus::Running);
    assert_eq!(detail.stages[2].status, StageStatus::Running);
    assert_eq!(detail.events.len(), 7);
    Ok(())
}

#[tokio::test]
async fn invalid_missing_and_duplicate_operations_remain_observable() -> TestResult {
    let database = memory().await?;
    let app = application(&database, None);
    assert!(matches!(
        app.create_work("  ", "").await,
        Err(ApplicationError::Validation(_))
    ));
    assert!(matches!(
        app.start_simulated_run(WorkItemId::new()).await,
        Err(ApplicationError::Repository(RepositoryError::NotFound(_)))
    ));
    assert!(matches!(
        app.get_work_detail(WorkItemId::new()).await,
        Err(ApplicationError::Repository(RepositoryError::NotFound(_)))
    ));
    let work = app.create_work("Concurrent dispatch", "").await?;
    let run = app.start_simulated_run(work.id).await?;
    let (first, second) = tokio::join!(
        app.execute_run_to_completion(work.id, run.id),
        app.execute_run_to_completion(work.id, run.id)
    );
    assert_ne!(first.is_ok(), second.is_ok());
    let detail = app.get_work_detail(work.id).await?.runs.remove(0);
    assert_eq!(detail.stages.len(), 8);
    assert_eq!(detail.events.len(), 19);
    database.close().await;
    assert!(matches!(
        app.list_work().await,
        Err(ApplicationError::Repository(RepositoryError::Persistence(
            _
        )))
    ));
    Ok(())
}

#[tokio::test]
async fn migration_upgrades_bootstrap_database_in_place() -> TestResult {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("bootstrap.sqlite3");
    let pool = sqlx::SqlitePool::connect_with(
        SqliteConnectOptions::new()
            .filename(&path)
            .create_if_missing(true),
    )
    .await?;
    // Apply the actual historical migration with SQLx's normal checksum tracking.
    let bootstrap = sqlx::migrate::Migrator {
        migrations: std::borrow::Cow::Owned(vec![
            crate::MIGRATOR
                .iter()
                .next()
                .ok_or("missing bootstrap")?
                .clone(),
        ]),
        ..sqlx::migrate::Migrator::DEFAULT
    };
    bootstrap.run(&pool).await?;
    let checksum: Vec<u8> =
        sqlx::query_scalar("SELECT checksum FROM _sqlx_migrations WHERE version = 1")
            .fetch_one(&pool)
            .await?;
    pool.close().await;
    let database = Database::open(&path).await?;
    database.check_ready().await?;
    assert_eq!(
        sqlx::query_scalar::<_, Vec<u8>>("SELECT checksum FROM _sqlx_migrations WHERE version = 1")
            .fetch_one(&database.pool)
            .await?,
        checksum
    );
    application(&database, None)
        .create_work("Upgraded", "")
        .await?;
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM _sqlx_migrations WHERE success = 1")
            .fetch_one(&database.pool)
            .await?,
        2
    );
    database.close().await;
    Ok(())
}

#[tokio::test]
async fn unknown_persisted_event_payload_is_an_error_not_empty_history() -> TestResult {
    let database = memory().await?;
    let app = application(&database, None);
    let work = app.create_work("Corrupt payload", "").await?;
    sqlx::query("UPDATE events SET payload = '{}' WHERE work_item_id = ?")
        .bind(work.id.to_string())
        .execute(&database.pool)
        .await?;
    assert!(matches!(
        app.get_work_detail(work.id).await,
        Err(ApplicationError::Repository(RepositoryError::Persistence(
            _
        )))
    ));
    Ok(())
}
