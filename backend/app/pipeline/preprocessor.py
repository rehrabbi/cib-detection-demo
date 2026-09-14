"""Step 3: Automated Preprocessing.

Executed entirely in memory before any data is written to the database:
- Field validation; drop records missing any of the eight required fields.
- Exact duplicate removal on (User_ID, Video_ID, Content, Parent_ID, Comment_Date).
- SHA-256 anonymization of the User_ID (channelId).
- ISO 8601 -> Unix epoch integer conversion for Comment_Date and Video_Post_Time.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone

import pandas as pd

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = [
    "Video_ID",
    "Channel_Name",
    "User_ID",
    "Content",
    "Comment_Date",
    "Is_Reply",
    "Parent_ID",
    "Video_Post_Time",
]

# Standard column mapping adapter to handle snake_case inputs from offline datasets
COLUMN_ALIASES = {
    "video_id": "Video_ID",
    "channel_name": "Channel_Name",
    "user_id": "User_ID",
    "comment_text": "Content",
    "content": "Content",
    "comment_date": "Comment_Date",
    "is_reply": "Is_Reply",
    "parent_id": "Parent_ID",
    "video_post_time": "Video_Post_Time",
}


def _iso_to_epoch(value: str | int | float | None) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return int(value)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())
    except Exception:
        return None


def _sha256(value: str) -> str:
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def preprocess(records: list[dict]) -> pd.DataFrame:
    """Apply the full Step 3 sequence and return a sanitized DataFrame."""
    if not records:
        return pd.DataFrame(columns=[
            "video_id", "channel_name", "commenter_hash", "content",
            "comment_date_iso", "is_reply", "parent_id", "video_post_time_iso",
            "comment_epoch", "video_post_epoch"
        ])

    df = pd.DataFrame(records)
    initial_count = len(df)

    # Normalize column names using aliases if snake_case headers are provided
    df = df.rename(columns={k: v for k, v in COLUMN_ALIASES.items() if k in df.columns})

    # Validate that required columns exist in the DataFrame
    missing_columns = [col for col in REQUIRED_FIELDS if col not in df.columns]
    if missing_columns:
        raise ValueError(
            f"Preprocessing failed: Missing required schema columns: {missing_columns}. "
            f"Available columns: {list(df.columns)}"
        )

    # Field validation: drop rows missing any required field (NaN or empty string).
    # Parent_ID is allowed to be null for top-level comments; treat that as valid.
    non_parent_cols = [col for col in REQUIRED_FIELDS if col != "Parent_ID"]
    mask_missing = df[non_parent_cols].isna().any(axis=1) | (
        df[[c for c in non_parent_cols if c != "Is_Reply"]].astype(str).eq("").any(axis=1)
    )
    df = df.loc[~mask_missing].copy()

    if df.empty and initial_count > 0:
        raise RuntimeError(
            f"Preprocessing dropped all {initial_count} records due to missing required fields."
        )

    # Exact-duplicate removal on the thesis-specified subset
    df = df.drop_duplicates(
        subset=["User_ID", "Video_ID", "Content", "Parent_ID", "Comment_Date"]
    )

    # SHA-256 anonymization (commenter_hash replaces raw User_ID before any persistence)
    df["commenter_hash"] = df["User_ID"].astype(str).map(_sha256)
    df = df.drop(columns=["User_ID"])

    # ISO 8601 -> Unix epoch conversion
    df["comment_epoch"] = df["Comment_Date"].map(_iso_to_epoch)
    df["video_post_epoch"] = df["Video_Post_Time"].map(_iso_to_epoch)
    
    # Drop records with invalid comment timestamps
    df = df.dropna(subset=["comment_epoch"])
    if df.empty and initial_count > 0:
        raise RuntimeError(
            f"Preprocessing dropped all records due to unparseable Comment_Date timestamps."
        )

    df["comment_epoch"] = df["comment_epoch"].astype("int64")
    df["video_post_epoch"] = df["video_post_epoch"].fillna(0).astype("int64")

    # Rename final dataframe to standard snake_case fields
    df = df.rename(
        columns={
            "Video_ID": "video_id",
            "Channel_Name": "channel_name",
            "Content": "content",
            "Comment_Date": "comment_date_iso",
            "Is_Reply": "is_reply",
            "Parent_ID": "parent_id",
            "Video_Post_Time": "video_post_time_iso",
        }
    )

    logger.info(
        "Preprocessing complete: %d input records -> %d sanitized records retained.",
        initial_count,
        len(df),
    )
    return df.reset_index(drop=True)