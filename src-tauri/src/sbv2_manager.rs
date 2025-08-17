use std::process::Child;
use std::sync::Mutex;

/// Global, app-managed process manager for sbv2_api to keep it unique across all webviews/windows
pub struct Sbv2Manager {
    pub child: Mutex<Option<Child>>,
}

impl Sbv2Manager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }

    /// Check if the child process is still running, clearing it if not
    pub fn is_running_inner(child: &mut Option<Child>) -> bool {
        if let Some(c) = child.as_mut() {
            match c.try_wait() {
                Ok(Some(_status)) => {
                    // Process has exited
                    *child = None;
                    false
                }
                Ok(None) => true,
                Err(_) => {
                    // On error, assume not running and clear
                    *child = None;
                    false
                }
            }
        } else {
            false
        }
    }
}

impl Drop for Sbv2Manager {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}
