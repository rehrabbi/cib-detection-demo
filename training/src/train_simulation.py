"""Train a SIMULATION model on synthetic seed data, for demonstrations only.

WHAT THIS IS NOT
This does not produce the model reported in the study. It is trained entirely on
synthetic comments from app/seed/generator.py, so its anomaly scores carry no
evidential weight and must never be cited as results. Its only purpose is to let
the tool be demonstrated end to end without depending on the real artifact or on
the 717 MB collection corpus.

Outputs go to backend/app/ml/artifacts/, which in THIS repository holds the
synthetic demo model. No real trained model exists here, so there is nothing to
overwrite. In the application repository the equivalent folder holds the real
model, and this script is not present there for that reason.

CORPUS SHAPE
generate_sample_dataset() produces two videos per call and reuses the same
commenter IDs on every call. Calling it repeatedly without adjustment would put
every synthetic organic commenter on every video, producing a near-complete
co-commenter graph that looks nothing like real data.

Instead, organic commenter IDs are namespaced per batch, apart from a small
crossover fraction, while the coordinated ("troll") IDs are kept global. That
gives the shape the real corpus has: most commenters appear on one or two videos
and score zero on both network features, while a small coordinated group
co-comments across many videos and forms a dense cluster.

Run:
    python training/src/train_simulation.py
"""

from __future__ import annotations

import argparse
import json
import logging
import random
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C

import shap
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from app.pipeline.preprocessor import preprocess
from app.seed.generator import generate_sample_dataset
from cocommenter_graph import build_edges, compute_network_features_fast
from fast_features import compute_behavioral_features_fast

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("simulation")

# Calibrated so the synthetic feature distribution approximates the real corpus.
# Measured against the real scaler's per-feature mean and standard deviation, the
# mean relative error falls from 1.030 at the first-guess settings to 0.309 here.
# The closest match is degree centrality, 0.00138 against the real 0.00140, which
# matters most because it is the feature most sensitive to corpus size.
N_BATCHES = 60               # two videos per batch, so 120 videos
ORGANIC_PER_BATCH = 900
COORDINATED_PER_BATCH = 20
ORGANIC_CROSSOVER = 0.04     # share of organics that appear across batches
COORDINATED_COHORT = 4       # batches spanned by one coordinated cohort
ARTIFACTS_DIR_NAME = "artifacts"


def build_corpus() -> list[dict]:
    """Synthetic records across N_BATCHES video pairs, with realistic overlap."""
    rng = random.Random(C.RANDOM_STATE)
    records: list[dict] = []

    for batch in range(N_BATCHES):
        batch_records = generate_sample_dataset(
            video_id_1=f"simVid{batch:03d}A",
            video_id_2=f"simVid{batch:03d}B",
            organic_commenters=ORGANIC_PER_BATCH,
            coordinated_commenters=COORDINATED_PER_BATCH,
            seed=C.RANDOM_STATE + batch,
        )
        for record in batch_records:
            uid = str(record["User_ID"])
            if uid.startswith("organic_user_"):
                # Most organics are unique to their batch. A minority keep the
                # global id so some legitimate cross-video commenting exists.
                if rng.random() >= ORGANIC_CROSSOVER:
                    record["User_ID"] = f"b{batch:03d}_{uid}"
            else:
                # Coordinated accounts operate in cohorts rather than as one
                # global set. A cohort spans COORDINATED_COHORT batches, so its
                # members co-comment across several videos, which is the pattern
                # the network features exist to catch, without accumulating an
                # unrealistic comment count across the whole corpus. Leaving them
                # global inflated the commenting-frequency standard deviation to
                # 41.4 against the real 15.4; cohorts bring it to 10.6.
                record["User_ID"] = f"c{batch // COORDINATED_COHORT:03d}_{uid}"
            records.append(record)

    log.info("Synthetic corpus: %s records across %d videos",
             f"{len(records):,}", N_BATCHES * 2)
    return records


def build_features(records: list[dict]) -> pd.DataFrame:
    df = preprocess(records)
    df["is_reply"] = df["is_reply"].astype(bool)
    log.info("After preprocessing: %s comments | %s commenters | %s videos",
             f"{len(df):,}", f"{df['commenter_hash'].nunique():,}",
             f"{df['video_id'].nunique():,}")

    behavioural = compute_behavioral_features_fast(
        df, burst_window_seconds=C.BURST_WINDOW_SECONDS
    )
    u, v, _w, keys = build_edges(
        df[["commenter_hash", "video_id"]], C.EDGE_MIN_COCOMMENTED_VIDEOS
    )
    network = compute_network_features_fast(
        u, v, keys, df["commenter_hash"].unique()
    )
    log.info("Co-commenter graph: %s edges", f"{len(u):,}")

    features = behavioural.merge(network, on="commenter_hash", how="left").fillna(0.0)
    return features[["commenter_hash"] + C.HYBRID_FEATURES]


def main(output_dir: Path) -> None:
    features = build_features(build_corpus())

    train_df, val_df = train_test_split(
        features, test_size=C.TEST_SIZE, random_state=C.RANDOM_STATE
    )
    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_df[C.HYBRID_FEATURES].to_numpy(dtype=float))

    model = IsolationForest(
        n_estimators=C.N_ESTIMATORS,
        max_samples=C.MAX_SAMPLES,
        contamination=C.CONTAMINATION_BASELINE,
        random_state=C.RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X_train)
    log.info("Trained on %s synthetic commenters (%s held out)",
             f"{len(train_df):,}", f"{len(val_df):,}")

    background = shap.kmeans(X_train, min(C.SHAP_BACKGROUND_K, len(X_train)))
    decisions = model.decision_function(X_train)

    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "isolation_forest_hybrid.joblib"
    scaler_path = output_dir / "standard_scaler.joblib"

    joblib.dump({
        "model": model,
        "background_summary": background,
        "d_min_train": float(decisions.min()),
        "d_max_train": float(decisions.max()),
    }, model_path)
    joblib.dump(scaler, scaler_path)

    # Smoke test through the deployed code path, so the demo cannot fail on a
    # bundle the tool is unable to load.
    from app.pipeline.model import HybridModelBundle

    HybridModelBundle.reset()
    bundle = HybridModelBundle.load(scaler_path, model_path)
    scored = bundle.score(val_df[["commenter_hash"] + C.HYBRID_FEATURES])
    flagged = int((scored["classification"] == "Anomalous").sum())
    HybridModelBundle.reset()

    (output_dir / "PROVENANCE.json").write_text(json.dumps({
        "synthetic": True,
        "not_for_reporting": True,
        "purpose": "tool demonstration only",
        "source": "app/seed/generator.py",
        "videos": N_BATCHES * 2,
        "commenters": int(len(features)),
        "train_rows": int(len(train_df)),
        "validation_rows": int(len(val_df)),
        "contamination": C.CONTAMINATION_BASELINE,
        "random_state": C.RANDOM_STATE,
        "generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2))

    log.info("-" * 78)
    log.info("SIMULATION model written to %s", output_dir)
    log.info("  loaded by the tool successfully, flagged %s of %s held-out commenters (%.2f%%)",
             f"{flagged:,}", f"{len(val_df):,}", 100 * flagged / len(val_df))
    log.info("  SYNTHETIC DATA. Not the study model. Do not cite these scores.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--output-dir",
        default=str(C.BACKEND_DIR / "app" / "ml" / ARTIFACTS_DIR_NAME),
        help="where to write the simulation bundle",
    )
    args = ap.parse_args()
    main(Path(args.output_dir).resolve())
