//! SQLite bootstrap and readiness. SQL and migration records stay in this adapter.

use std::{path::Path, time::Duration};

use sqlx::{
    SqlitePool, migrate::Migrator, sqlite::SqliteConnectOptions, sqlite::SqlitePoolOptions,
};
use thiserror::Error;

static MIGRATOR: Migrator = sqlx::migrate!();

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("could not open the application database")]
    Open(#[source] sqlx::Error),
    #[error("database migration failed; existing data has been retained")]
    Migration(#[source] sqlx::migrate::MigrateError),
    #[error("database readiness check failed")]
    Readiness(#[source] sqlx::Error),
}

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Opens or creates the database at a path owned by the composition root.
    /// Failing migrations propagate without deleting or resetting the database.
    pub async fn open(path: &Path) -> Result<Self, StorageError> {
        Self::connect(
            SqliteConnectOptions::new()
                .filename(path)
                .create_if_missing(true),
        )
        .await
    }

    async fn connect(options: SqliteConnectOptions) -> Result<Self, StorageError> {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .acquire_timeout(Duration::from_secs(5))
            .connect_with(options)
            .await
            .map_err(StorageError::Open)?;
        MIGRATOR.run(&pool).await.map_err(StorageError::Migration)?;
        Ok(Self { pool })
    }

    pub async fn check_ready(&self) -> Result<(), StorageError> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map_err(StorageError::Readiness)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn bootstrap_applies_migrations_and_is_repeatable()
    -> Result<(), Box<dyn std::error::Error>> {
        let database = Database::connect(SqliteConnectOptions::new().in_memory(true)).await?;
        database.check_ready().await?;
        MIGRATOR.run(&database.pool).await?;

        let applied: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE success = 1")
                .fetch_one(&database.pool)
                .await?;
        assert_eq!(applied, 1);
        let product_tables: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name != '_sqlx_migrations'",
        )
        .fetch_one(&database.pool)
        .await?;
        assert_eq!(product_tables, 0);
        Ok(())
    }

    #[tokio::test]
    async fn closed_database_is_not_ready() -> Result<(), StorageError> {
        let database = Database::connect(SqliteConnectOptions::new().in_memory(true)).await?;
        database.pool.close().await;
        assert!(matches!(
            database.check_ready().await,
            Err(StorageError::Readiness(_))
        ));
        Ok(())
    }

    #[tokio::test]
    async fn opening_a_directory_is_an_observable_error() {
        let result = Database::open(Path::new(env!("CARGO_MANIFEST_DIR"))).await;
        assert!(matches!(result, Err(StorageError::Open(_))));
    }

    #[tokio::test]
    async fn modified_migration_is_rejected_without_resetting_data()
    -> Result<(), Box<dyn std::error::Error>> {
        let database = Database::connect(SqliteConnectOptions::new().in_memory(true)).await?;
        sqlx::query("UPDATE _sqlx_migrations SET checksum = X'00'")
            .execute(&database.pool)
            .await?;
        assert!(MIGRATOR.run(&database.pool).await.is_err());
        let retained: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations")
            .fetch_one(&database.pool)
            .await?;
        assert_eq!(retained, 1);
        Ok(())
    }
}
