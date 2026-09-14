fn main() -> Result<(), Box<dyn std::error::Error>> {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "runtime_health",
            "create_work",
            "list_work",
            "get_work_detail",
            "start_simulated_run",
        ]),
    ))?;
    Ok(())
}
