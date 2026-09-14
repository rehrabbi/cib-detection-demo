"""Vectorised TF-IDF content repetition, mathematically identical to the tool's.

THE PROBLEM
-----------
_tfidf_content_repetition() in app/pipeline/features.py loops over every
commenter, slices their rows out of the TF-IDF matrix, and calls
cosine_similarity() to build a full k x k similarity matrix, of which it keeps
only the mean of the upper triangle.

That is correct and perfectly fine for a two-video job. At research scale it is
the dominant cost, and it grows superlinearly because each slice gets more
expensive as the corpus matrix grows:

    150,000 comments ->  20.1s        Dataset B (580k) did not finish in 600s
                                      Dataset A is 3.5x larger again

THE IDENTITY
------------
TfidfVectorizer L2-normalises its rows by default, so for two comment vectors
the cosine similarity is just the dot product:

    cos(r_i, r_j) = r_i . r_j

For one commenter with comment vectors r_1 .. r_k, expanding the square of
their sum gives every pairwise dot product at once:

    S = || sum_i r_i ||^2 = sum_i sum_j (r_i . r_j)          all k^2 terms
    D = sum_i || r_i ||^2                                     the k diagonal terms

The off-diagonal terms are what the tool averages, and each unordered pair
appears twice, so

    upper triangle sum = (S - D) / 2
    number of pairs    = k (k - 1) / 2
    mean               = (S - D) / (k (k - 1))

D is computed from the actual row norms rather than assumed to equal k, so a
comment whose terms all fall outside the vocabulary (a zero row, norm 0) is
handled correctly instead of silently contributing a phantom 1.

Because S and D are both obtainable by summing rows per commenter, the whole
thing becomes two sparse products with no Python loop at all.

Equivalence is asserted numerically by verify_tfidf.py against the tool's own
function, so this is a speed change and not a methodology change.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import scipy.sparse as sp
from sklearn.feature_extraction.text import TfidfVectorizer

from app.pipeline.features import (
    BEHAVIORAL_FEATURES,
    _commenting_frequency,
    _reply_count,
    _temporal_burst_activity,
)

# Identical to the vectoriser configured in app/pipeline/features.py. If that
# ever changes, this must change with it or the two will silently disagree.
VECTORIZER_KWARGS = dict(lowercase=True, ngram_range=(1, 2), max_features=20000, min_df=1)


def tfidf_content_repetition_fast(df: pd.DataFrame) -> pd.Series:
    """Per-commenter mean pairwise cosine similarity among their own comments."""
    contents = df["content"].astype(str).fillna("")
    if contents.empty or contents.str.strip().eq("").all():
        return pd.Series(dtype=float, name="tfidf_content_repetition")

    vectorizer = TfidfVectorizer(**VECTORIZER_KWARGS)
    try:
        matrix = vectorizer.fit_transform(contents)
    except ValueError:
        # Empty vocabulary, mirrors the tool's fallback exactly.
        return pd.Series(
            0.0, index=df["commenter_hash"].unique(), name="tfidf_content_repetition"
        )

    codes, keys = pd.factorize(df["commenter_hash"])
    n_commenters = len(keys)

    # Grouping matrix: row c has a 1 in column i when comment i belongs to
    # commenter c. G @ matrix therefore sums each commenter's comment vectors.
    grouping = sp.csr_matrix(
        (np.ones(len(codes), dtype=np.float64), (codes, np.arange(len(codes)))),
        shape=(n_commenters, matrix.shape[0]),
    )

    summed = grouping @ matrix
    S = np.asarray(summed.multiply(summed).sum(axis=1)).ravel()
    row_sq_norms = np.asarray(matrix.multiply(matrix).sum(axis=1)).ravel()
    D = np.asarray(grouping @ row_sq_norms).ravel()
    k = np.asarray(grouping.sum(axis=1)).ravel()

    denom = k * (k - 1.0)
    repetition = np.divide(
        S - D, denom, out=np.zeros(n_commenters, dtype=np.float64), where=denom > 0
    )
    return pd.Series(repetition, index=keys, name="tfidf_content_repetition")


def compute_behavioral_features_fast(
    df: pd.DataFrame, burst_window_seconds: int
) -> pd.DataFrame:
    """Drop-in replacement for the tool's compute_behavioral_features().

    Frequency, burst and reply count are the tool's own functions, unmodified.
    Only the TF-IDF term is swapped for the vectorised equivalent. Assembly
    mirrors the original exactly, including fillna(0.0) and column order.
    """
    if df.empty:
        return pd.DataFrame(columns=["commenter_hash"] + BEHAVIORAL_FEATURES)

    freq = _commenting_frequency(df)
    burst = _temporal_burst_activity(df, burst_window_seconds)
    tfidf = tfidf_content_repetition_fast(df)
    replies = _reply_count(df)

    features = pd.concat([freq, burst, tfidf, replies], axis=1).fillna(0.0)
    features.index.name = "commenter_hash"
    features = features.reset_index()
    return features[["commenter_hash"] + BEHAVIORAL_FEATURES]
