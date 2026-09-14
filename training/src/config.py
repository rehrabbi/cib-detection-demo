"""Central configuration for the CIB model training pipeline.

Every decision the team has made is recorded here rather than scattered across
scripts, so that a single file answers "what did we actually run?".

Thesis references are given so each constant can be traced back to Chapter 3.
"""

from __future__ import annotations

import sys
from pathlib import Path

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------

TRAINING_DIR = Path(__file__).resolve().parent.parent      # <repo>/training
REPO_ROOT = TRAINING_DIR.parent                            # <repo>
BACKEND_DIR = REPO_ROOT / "backend"
OUTPUT_DIR = TRAINING_DIR / "outputs"
LOG_DIR = TRAINING_DIR / "logs"

# Raw collection CSVs. Roughly 717 MB, so they are not tracked in the
# repository. See training/README.md for the expected folder layout.
DATA_DIR = REPO_ROOT / "CIBWatch DATA"

# The deployed tool's own pipeline code is imported directly from the cloned
# repo rather than copied. If the tool and this pipeline ever compute features
# differently, the Classification Consistency Rate (Ch. 3, System Validation
# Testing) would be measuring our own inconsistency instead of the tool's
# fidelity. Importing guarantees they cannot drift.
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# --------------------------------------------------------------------------
# Datasets  (Ch. 3, Sources of Data)
# --------------------------------------------------------------------------
# Dataset A: 2022 Presidential Election, fitting + validation corpus.
# Dataset B: 2025 Midterm Election, cross-temporal testing only, never refit.
#
# Dates are the COMELEC campaign-period boundaries. They bound video selection,
# and (Fix 2) they now also bound comment dates. Measured effect: 1.2% of
# Dataset A and 1.3% of Dataset B removed, all of it posted AFTER the window.

DATASETS = {
    "A": {"year": "2022", "start": "2022-01-09", "end": "2022-06-08"},
    "B": {"year": "2025", "start": "2025-01-12", "end": "2025-06-11"},
}

# --------------------------------------------------------------------------
# Canonical source files
# --------------------------------------------------------------------------
# 2022 shipped 13 comment files for 10 channels. Resolved as follows:
#
#   News5Everywhere ... rev(1).csv  exact byte-for-byte copy of rev.csv (same
#                                   MD5). Redundant.
#   UNTV / TheBoyAbunda (Jun-Aug)   earlier, incomplete runs collected BEFORE
#                                   the manual relevance review. They contain
#                                   23 and 3 videos marked include=FALSE.
#   v1_UNTV                         recollected 2026-08-14 against the approved
#                                   list. 833 videos, 0 rejected. CANONICAL.
#   v2_TheBoyAbunda                 recollected 2026-08-23, completing the
#                                   channel: all 66 approved videos, 0 rejected,
#                                   339,818 rows against v1's 74,610. It is a
#                                   strict superset of v1, which is now gone.
#                                   CANONICAL.
#
# The "v1_"/"v2_" prefixes are misleading: by file timestamp these are the
# NEWEST runs, not the earliest.

EXCLUDED_FILES = {
    "News5Everywhere_comments_raw_2022 rev(1).csv",
    "UNTV_comments_raw_2022.csv",
    "TheBoyAbunda_comments_raw_2022.csv",
}

# --------------------------------------------------------------------------
# Feature parameters  (Ch. 3, Data Analysis)
# --------------------------------------------------------------------------

BURST_WINDOW_SECONDS = 600          # 10-minute temporal burst window
EDGE_MIN_COCOMMENTED_VIDEOS = 2     # co-commenter edge threshold

# --------------------------------------------------------------------------
# Model parameters  (Ch. 3, Statistical Treatment)
# --------------------------------------------------------------------------

RANDOM_STATE = 42
TEST_SIZE = 0.20                    # 80/20 split of Dataset A
N_ESTIMATORS = 200
MAX_SAMPLES = "auto"
CONTAMINATION_BASELINE = 0.05
CONTAMINATION_SWEEP = [0.03, 0.05, 0.10]    # sensitivity analysis
SHAP_TOP_N = 100                            # top-N anomalous for attribution
SHAP_BACKGROUND_K = 50                      # shap.kmeans summary size

# 8 physical cores available; 6 leaves headroom for the OS and the parent process.
N_WORKERS = 6

# MLflow 3.x put the filesystem store into maintenance mode and refuses it by
# default, so the "file:./mlruns" form in backend/.env.example no longer works
# on this version. SQLite is the supported local backend: still a single file,
# still fully offline, no server required. Worth telling the backend team, since
# their .env carries the deprecated form.
MLFLOW_TRACKING_URI = f"sqlite:///{(TRAINING_DIR / 'mlflow.db').as_posix()}"
MLFLOW_EXPERIMENT = "cib_hybrid_isolation_forest"

BEHAVIORAL_FEATURES = [
    "commenting_frequency",
    "temporal_burst_activity",
    "tfidf_content_repetition",
    "reply_count",
]
NETWORK_FEATURES = ["degree_centrality", "clustering_coefficient"]
HYBRID_FEATURES = BEHAVIORAL_FEATURES + NETWORK_FEATURES

VARIANTS = {
    "behavioral_only": BEHAVIORAL_FEATURES,
    "network_only": NETWORK_FEATURES,
    "hybrid": HYBRID_FEATURES,
}


def candidate_dir(dataset: str) -> Path:
    return DATA_DIR / DATASETS[dataset]["year"] / "candidate videos"


def raw_comments_dir(dataset: str) -> Path:
    return DATA_DIR / DATASETS[dataset]["year"] / "raw comments"


def raw_comment_files(dataset: str) -> list[Path]:
    """Canonical comment CSVs for a dataset, with superseded files removed."""
    return sorted(
        f for f in raw_comments_dir(dataset).glob("*.csv")
        if f.name not in EXCLUDED_FILES
    )
