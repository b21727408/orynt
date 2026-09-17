use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::ids::WorkItemId;

#[derive(Debug, Error)]
pub enum WorkError {
    #[error("Title must contain between 1 and 200 characters after trimming.")]
    Title,
    #[error("Objective must contain at most 10,000 characters.")]
    Objective,
    #[error("timestamp is outside the supported Unix millisecond range")]
    Timestamp,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(try_from = "i64", into = "i64")]
pub struct Timestamp(i64);

impl Timestamp {
    pub fn now() -> Result<Self, WorkError> {
        let elapsed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| WorkError::Timestamp)?;
        let millis = i64::try_from(elapsed.as_millis()).map_err(|_| WorkError::Timestamp)?;
        Self::try_from(millis)
    }

    pub fn unix_millis(self) -> i64 {
        self.0
    }
}

impl TryFrom<i64> for Timestamp {
    type Error = WorkError;
    fn try_from(value: i64) -> Result<Self, Self::Error> {
        // JavaScript Date's supported range; timestamps cross the desktop boundary.
        if !(0..=8_640_000_000_000_000).contains(&value) {
            return Err(WorkError::Timestamp);
        }
        Ok(Self(value))
    }
}

impl From<Timestamp> for i64 {
    fn from(value: Timestamp) -> Self {
        value.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkItem {
    pub id: WorkItemId,
    pub title: String,
    pub objective: String,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

impl WorkItem {
    pub fn new(title: &str, objective: &str, at: Timestamp) -> Result<Self, WorkError> {
        let title = title.trim();
        // Count UTF-16 units to match browser input/Zod length validation.
        if title.is_empty() || title.encode_utf16().count() > 200 {
            return Err(WorkError::Title);
        }
        if objective.encode_utf16().count() > 10_000 {
            return Err(WorkError::Objective);
        }
        Ok(Self {
            id: WorkItemId::new(),
            title: title.to_owned(),
            objective: objective.to_owned(),
            created_at: at,
            updated_at: at,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_and_trims_manual_work() -> Result<(), WorkError> {
        let at = Timestamp::try_from(0)?;
        assert_eq!(WorkItem::new("  Work  ", "", at)?.title, "Work");
        assert!(WorkItem::new(" \n", "", at).is_err());
        assert!(WorkItem::new(&"a".repeat(201), "", at).is_err());
        assert!(WorkItem::new(&"🦀".repeat(101), "", at).is_err());
        assert!(WorkItem::new("Work", &"a".repeat(10_001), at).is_err());
        assert!(Timestamp::try_from(-1).is_err());
        Ok(())
    }
}
