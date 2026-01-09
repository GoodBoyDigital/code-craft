use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};

// Store PTY sessions globally
lazy_static::lazy_static! {
    static ref PTY_SESSIONS: Mutex<HashMap<String, PtySession>> = Mutex::new(HashMap::new());
}

struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    shutdown_flag: Arc<AtomicBool>,
    reader_thread: Option<thread::JoinHandle<()>>,
}

#[tauri::command]
pub async fn create_pty_session(
    app_handle: AppHandle,
    session_id: String,
    cwd: String,
    command: Option<String>,
) -> Result<String, String> {
    // Create PTY system
    let pty_system = native_pty_system();

    // Set initial size
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to create PTY: {}", e))?;

    // Build command
    let mut cmd = if let Some(cmd_str) = command {
        // Custom command (e.g., "claude")
        let parts: Vec<&str> = cmd_str.split_whitespace().collect();
        let mut builder = CommandBuilder::new(parts[0]);
        for arg in &parts[1..] {
            builder.arg(*arg);
        }
        builder
    } else {
        // Default shell
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        CommandBuilder::new(shell)
    };

    cmd.cwd(&cwd);

    // Spawn the child process
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    // Get writer for sending input
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;
    let writer = Arc::new(Mutex::new(writer));

    // Get reader for receiving output
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

    // Store master for resize operations
    let master: Box<dyn MasterPty + Send> = pair.master;
    let master = Arc::new(Mutex::new(master));

    // Shutdown flag for clean termination
    let shutdown_flag = Arc::new(AtomicBool::new(false));
    let shutdown_flag_clone = shutdown_flag.clone();

    // Spawn thread to read PTY output and emit events
    let event_session_id = session_id.clone();
    let reader_thread = thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        loop {
            // Check shutdown flag
            if shutdown_flag_clone.load(Ordering::Relaxed) {
                break;
            }

            match reader.read(&mut buffer) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let event_name = format!("pty-output-{}", event_session_id);
                    let _ = app_handle.emit(&event_name, output);
                }
                Err(e) => {
                    // Don't log error if we're shutting down
                    if !shutdown_flag_clone.load(Ordering::Relaxed) {
                        eprintln!("PTY read error: {}", e);
                    }
                    break;
                }
            }
        }
    });

    // Spawn a thread to wait for the child process and clean up
    let cleanup_session_id = session_id.clone();
    thread::spawn(move || {
        // Wait for the child process to exit
        let _ = child.wait();

        // Remove session from the map when child exits
        let mut sessions = PTY_SESSIONS.lock();
        if let Some(session) = sessions.remove(&cleanup_session_id) {
            session.shutdown_flag.store(true, Ordering::Relaxed);
        }
    });

    // Store session
    let session = PtySession {
        writer,
        master,
        shutdown_flag,
        reader_thread: Some(reader_thread),
    };

    PTY_SESSIONS.lock().insert(session_id.clone(), session);

    Ok(session_id)
}

#[tauri::command]
pub async fn write_to_pty(session_id: String, data: String) -> Result<(), String> {
    // Clone the writer Arc to release the session lock quickly
    let writer = {
        let sessions = PTY_SESSIONS.lock();
        let session = sessions
            .get(&session_id)
            .ok_or_else(|| format!("PTY session not found: {}", session_id))?;
        session.writer.clone()
    };

    // Now write without holding the sessions lock
    let mut writer_guard = writer.lock();
    writer_guard
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {}", e))?;
    writer_guard
        .flush()
        .map_err(|e| format!("Failed to flush PTY: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn resize_pty(session_id: String, cols: u16, rows: u16) -> Result<(), String> {
    // Clone the master Arc to release the session lock quickly
    let master = {
        let sessions = PTY_SESSIONS.lock();
        let session = sessions
            .get(&session_id)
            .ok_or_else(|| format!("PTY session not found: {}", session_id))?;
        session.master.clone()
    };

    // Resize without holding the sessions lock
    let master_guard = master.lock();
    master_guard
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize PTY: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn close_pty_session(session_id: String) -> Result<(), String> {
    let session = {
        let mut sessions = PTY_SESSIONS.lock();
        sessions.remove(&session_id)
    };

    if let Some(session) = session {
        // Signal the reader thread to stop
        session.shutdown_flag.store(true, Ordering::Relaxed);

        // Drop the writer to close the PTY input, which will cause the child to receive EOF
        drop(session.writer);

        // The reader thread will exit when it detects shutdown or gets EOF/error
        // We don't join here to avoid blocking, but the thread will clean up

        Ok(())
    } else {
        Err(format!("PTY session not found: {}", session_id))
    }
}
