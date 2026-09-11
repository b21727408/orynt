use anyhow::Context;
use orynt_storage::Database;
use serde::Serialize;
use tauri::{Manager, State};

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
enum HealthStatus {
    Healthy,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
enum DatabaseStatus {
    Ready,
}

#[derive(Serialize)]
struct RuntimeHealth {
    status: HealthStatus,
    version: &'static str,
    database: DatabaseStatus,
}

#[tauri::command]
async fn runtime_health(database: State<'_, Database>) -> Result<RuntimeHealth, &'static str> {
    database.check_ready().await.map_err(|error| {
        tracing::error!(error = ?error, "Runtime health check failed");
        "Database readiness check failed. Restart Orynt and inspect the startup output if the problem continues."
    })?;

    Ok(RuntimeHealth {
        status: HealthStatus::Healthy,
        version: env!("CARGO_PKG_VERSION"),
        database: DatabaseStatus::Ready,
    })
}

pub fn run() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .try_init()
        .map_err(|error| anyhow::anyhow!("could not initialize tracing: {error}"))?;

    let result = tauri::Builder::default()
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .context("could not resolve application data directory")?;
            std::fs::create_dir_all(&data_dir)
                .context("could not create application data directory")?;
            let database =
                tauri::async_runtime::block_on(Database::open(&data_dir.join("orynt.sqlite3")))
                    .context("database startup failed; existing database has not been reset")?;
            app.manage(database);
            tracing::info!(
                version = env!("CARGO_PKG_VERSION"),
                "Orynt started; database migrations applied"
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![runtime_health])
        .run(tauri::generate_context!());

    result.map_err(|error| {
        tracing::error!(error = ?error, "Orynt failed");
        anyhow::Error::new(error).context("Orynt could not run")
    })
}
