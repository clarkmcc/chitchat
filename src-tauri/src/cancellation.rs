use std::convert::Infallible;
use std::sync::atomic::{AtomicBool, Ordering};
use tracing::info;

#[derive(Default)]
pub struct Canceller {
    cancelled: AtomicBool,
}

impl Canceller {
    #[tracing::instrument(skip(self))]
    pub fn cancel(&self) {
        info!("cancelling inference");
        self.cancelled.store(true, Ordering::Release);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Acquire)
    }

    pub fn reset(&self) {
        self.cancelled.store(false, Ordering::Release);
    }

    #[tracing::instrument(skip(self))]
    pub fn inference_feedback(&self) -> Result<llm::InferenceFeedback, Infallible> {
        if self.is_cancelled() {
            info!("sending halt");
            Ok(llm::InferenceFeedback::Halt)
        } else {
            Ok(llm::InferenceFeedback::Continue)
        }
    }
}
