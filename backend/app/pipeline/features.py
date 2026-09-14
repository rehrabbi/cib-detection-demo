"""Step 4 (part 1): Behavioral feature extraction.

Computes the four behavioral features defined in the thesis:
    1. Commenting Frequency      - total comments per unique commenter
    2. Temporal Burst Activity   - max comments within a 10-minute (BURST_WINDOW_SECONDS) window
    3. TF-IDF Content Repetition - average pairwise cosine similarity between a commenter's
                                   own comments to measure self-repetition.
    4. Reply Count per Commenter - number of records where parent_id references another comment
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BEHAVIORAL_FEATURES = [
    "commenting_frequency",
    "temporal_burst_activity",
    "tfidf_content_repetition",
    "reply_count",
]


def _commenting_frequency(df: pd.DataFrame) -> pd.Series:
    return df.groupby("commenter_hash").size().rename("commenting_frequency")


def _temporal_burst_activity(df: pd.DataFrame, window_seconds: int) -> pd.Series:
    """Maximum number of comments any commenter posts within a sliding `window_seconds` window."""
    results: dict[str, int] = {}
    for commenter, group in df.groupby("commenter_hash"):
        times = np.sort(group["comment_epoch"].to_numpy())
        if len(times) <= 1:
            results[commenter] = len(times)
            continue
        left = 0
        best = 1
        for right in range(len(times)):
            while times[right] - times[left] > window_seconds:
                left += 1
            best = max(best, right - left + 1)
        results[commenter] = best
    return pd.Series(results, name="temporal_burst_activity")


def _tfidf_content_repetition(df: pd.DataFrame) -> pd.Series:
    """Per-commenter mean pairwise cosine similarity among their own comments."""
    contents = df["content"].astype(str).fillna("")
    if contents.empty or contents.str.strip().eq("").all():
        return pd.Series(dtype=float, name="tfidf_content_repetition")

    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        max_features=20000,
        min_df=1,
    )
    try:
        matrix = vectorizer.fit_transform(contents)
    except ValueError:
        # Empty vocabulary (all stop-words / empty strings) — return zeros.
        return pd.Series(
            0.0, index=df["commenter_hash"].unique(), name="tfidf_content_repetition"
        )

    results: dict[str, float] = {}
    indices_by_commenter = df.groupby("commenter_hash").indices
    for commenter, idx in indices_by_commenter.items():
        if len(idx) <= 1:
            results[commenter] = 0.0
            continue
        sub = matrix[idx]
        sims = cosine_similarity(sub)
        n = sims.shape[0]
        if n <= 1:
            results[commenter] = 0.0
            continue
        # Mean of off-diagonal upper-triangle pairwise similarities.
        triu = np.triu_indices(n, k=1)
        results[commenter] = float(sims[triu].mean())
    return pd.Series(results, name="tfidf_content_repetition")


def _reply_count(df: pd.DataFrame) -> pd.Series:
    replies = df.loc[df["is_reply"].astype(bool), "commenter_hash"].value_counts()
    return replies.rename("reply_count")


def compute_behavioral_features(df: pd.DataFrame, burst_window_seconds: int) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["commenter_hash"] + BEHAVIORAL_FEATURES)

    freq = _commenting_frequency(df)
    burst = _temporal_burst_activity(df, burst_window_seconds)
    tfidf = _tfidf_content_repetition(df)
    replies = _reply_count(df)

    features = pd.concat([freq, burst, tfidf, replies], axis=1).fillna(0.0)
    features.index.name = "commenter_hash"
    features = features.reset_index()
    return features[["commenter_hash"] + BEHAVIORAL_FEATURES]