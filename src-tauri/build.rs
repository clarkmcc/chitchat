fn main() {
    tauri_build::build();
    vergen::EmitBuilder::builder().emit().unwrap();
}
