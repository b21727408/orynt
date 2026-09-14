use std::{fmt, str::FromStr};

use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
#[error("expected a canonical UUID v7 identifier")]
pub struct InvalidId;

macro_rules! identifier {
    ($($name:ident),+ $(,)?) => {$(
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
        #[serde(try_from = "String", into = "String")]
        pub struct $name(Uuid);

        impl $name {
            pub fn new() -> Self { Self(Uuid::now_v7()) }
        }

        impl Default for $name {
            fn default() -> Self { Self::new() }
        }

        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                self.0.hyphenated().fmt(f)
            }
        }

        impl FromStr for $name {
            type Err = InvalidId;
            fn from_str(value: &str) -> Result<Self, Self::Err> {
                let id = Uuid::parse_str(value).map_err(|_| InvalidId)?;
                if id.get_version_num() != 7 || id.get_variant() != uuid::Variant::RFC4122 || id.hyphenated().to_string() != value {
                    return Err(InvalidId);
                }
                Ok(Self(id))
            }
        }

        impl TryFrom<String> for $name {
            type Error = InvalidId;
            fn try_from(value: String) -> Result<Self, Self::Error> { value.parse() }
        }

        impl From<$name> for String {
            fn from(value: $name) -> Self { value.to_string() }
        }
    )+};
}

identifier!(
    WorkItemId,
    RunId,
    ExecutionPlanRevisionId,
    StageExecutionId,
    EventId
);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identifiers_are_distinct_canonical_v7_values() -> Result<(), InvalidId> {
        let first = WorkItemId::new();
        let second = WorkItemId::new();
        assert_ne!(first, second);
        assert_eq!(first.to_string().parse::<WorkItemId>()?, first);
        assert_eq!(&first.to_string()[14..15], "7");
        for bad in [
            "",
            "vendor-42",
            "00000000-0000-4000-8000-000000000000",
            "00000000-0000-7000-0000-000000000000",
            "00000000000070008000000000000000",
        ] {
            assert!(bad.parse::<RunId>().is_err());
        }
        Ok(())
    }
}
