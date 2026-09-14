"""Train and serialize the hybrid behavioral-network Isolation Forest on synthetic data.

Mirrors the thesis methodology (Chapter 3):
- Three Isolation Forest variants (behavioral-only, network-only, hybrid) trained
  under identical conditions.
- StandardScaler fit exclusively on the 80% training partition.
- Evaluation: Silhouette Score, Davies-Bouldin Index, Anomaly Detection Rate on 20% val.
- The best-performing hybrid variant is serialized via joblib for deployment, including
  background data for KernelExplainer and boundary bounds for the CIB Risk score.
- MLflow logs every variant's hyperparameters and metrics.

Run:
    python -m app.ml.train_sample
"""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path

import joblib
import mlflow
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import IsolationForest
from sklearn.metrics import davies_bouldin_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from app.config import BASE_DIR, get_settings
from app.pipeline.features import BEHAVIORAL_FEATURES, compute_behavioral_features
from app.pipeline.network import (
    NETWORK_FEATURES,
    build_cocommenter_graph,
    compute_network_features,
)
from app.pipeline.preprocessor import preprocess
from app.seed.generator import generate_sample_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("train_sample")

HYBRID_FEATURES = BEHAVIORAL_FEATURES + NETWORK_FEATURES


def _build_features(dataset_id: int, seed: int) -> pd.DataFrame:
    raw = generate_sample_dataset(
        video_id_1=f"sampleVid{dataset_id}A",
        video_id_2=f"sampleVid{dataset_id}B",
        seed=seed,
    )
    df = preprocess(raw)
    behavioral = compute_behavioral_features(df, burst_window_seconds=600)
    graph = build_cocommenter_graph(df, edge_min_cocommented_videos=2)
    network = compute_network_features(graph)
    features = behavioral.merge(network, on="commenter_hash", how="left").fillna(0.0)
    return features


def _evaluate(
    name: str,
    X: np.ndarray,
    labels: np.ndarray,
    contamination: float,
) -> dict:
    if len(np.unique(labels)) < 2:
        sil = float("nan")
        db = float("nan")
    else:
        sil = silhouette_score(X, labels)
        db = davies_bouldin_score(X, labels)
    rate = float((labels == -1).mean())
    metrics = {
        "silhouette_score": float(sil),
        "davies_bouldin_index": float(db),
        "anomaly_detection_rate": rate,
        "contamination": float(contamination),
    }
    logger.info(
        "%s | silhouette=%.4f | davies_bouldin=%.4f | anomaly_rate=%.4f",
        name,
        metrics["silhouette_score"],
        metrics["davies_bouldin_index"],
        metrics["anomaly_detection_rate"],
    )
    return metrics


def train_variant(
    name: str,
    features: list[str],
    df: pd.DataFrame,
    contamination: float,
    random_state: int,
) -> tuple[dict, StandardScaler, dict]:
    """Train one Isolation Forest variant; return artifact bundle dict, scaler, and metrics."""
    
    # CONFLICT 4 FIX: Use explicit train_test_split instead of df.sample for absolute reproducibility.
    train_df, val_df = train_test_split(df, test_size=0.20, random_state=random_state)

    # CONFLICT 1 FIX: Strictly use StandardScaler as dictated by thesis.
    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_df[features].to_numpy(dtype=float))
    X_val = scaler.transform(val_df[features].to_numpy(dtype=float))

    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples='auto', # THESIS DOCUMENTATION NEEDED: Document these hyperparameters
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_train)
    val_labels = model.predict(X_val)

    metrics = _evaluate(name, X_val, val_labels, contamination)

    # CONFLICT 2 FIX: Precompute background dataset summary for SHAP KernelExplainer
    # K=50 is a standard robust choice for kmeans summaries.
    n_unique_rows = np.unique(X_train, axis=0).shape[0]
    k = min(50, n_unique_rows)
    background_summary = shap.kmeans(X_train, k)

    # CONFLICT 6 FIX: Freeze the global min/max decision boundaries on the training set
    # so the CIB risk score remains completely deterministic during inference.
    train_decisions = model.decision_function(X_train)
    
    artifact_bundle = {
        "model": model,
        "background_summary": background_summary,
        "d_min_train": float(np.min(train_decisions)),
        "d_max_train": float(np.max(train_decisions)),
    }

    return artifact_bundle, scaler, metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contamination", type=float, default=None)
    parser.add_argument("--random-state", type=int, default=None)
    args = parser.parse_args()

    settings = get_settings()
    contamination = args.contamination if args.contamination is not None else settings.contamination
    random_state = args.random_state if args.random_state is not None else settings.random_state

    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment("cib_hybrid_isolation_forest")

    logger.info("Generating synthetic Dataset A (2022) for sample training...")
    features_df = _build_features(dataset_id=1, seed=random_state)
    logger.info("Built feature matrix: %d commenters x %d features", *features_df.shape)

    variants = {
        "behavioral_only": BEHAVIORAL_FEATURES,
        "network_only": NETWORK_FEATURES,
        "hybrid": HYBRID_FEATURES,
    }

    results: dict[str, dict] = {}
    artifacts: dict[str, tuple[dict, StandardScaler]] = {}

    for name, cols in variants.items():
        with mlflow.start_run(run_name=name):
            mlflow.log_param("contamination", contamination)
            mlflow.log_param("random_state", random_state)
            mlflow.log_param("variant", name)
            mlflow.log_param("features", ",".join(cols))

            artifact_bundle, scaler, metrics = train_variant(
                name=name,
                features=cols,
                df=features_df,
                contamination=contamination,
                random_state=random_state,
            )
            for k, v in metrics.items():
                mlflow.log_metric(k, v)
            results[name] = metrics
            artifacts[name] = (artifact_bundle, scaler)

    # Serialize the hybrid bundle + scaler (the deployed configuration).
    hybrid_bundle, hybrid_scaler = artifacts["hybrid"]
    model_out = (BASE_DIR / Path(settings.model_path)).resolve()
    scaler_out = (BASE_DIR / Path(settings.scaler_path)).resolve()
    model_out.parent.mkdir(parents=True, exist_ok=True)
    
    # Save the full dictionary payload (Model + SHAP Background + Frozen Bounds)
    joblib.dump(hybrid_bundle, model_out)
    joblib.dump(hybrid_scaler, scaler_out)

    logger.info("Saved hybrid artifact bundle (Model/SHAP/Bounds) to %s", model_out)
    logger.info("Saved fitted StandardScaler to %s", scaler_out)
    logger.info("Experimental comparison summary:")
    for name, m in results.items():
        logger.info(
            "  %-18s sil=%.4f  DB=%.4f  rate=%.4f",
            name,
            m["silhouette_score"],
            m["davies_bouldin_index"],
            m["anomaly_detection_rate"],
        )

if __name__ == "__main__":
    os.environ.setdefault("MLFLOW_TRACKING_URI", get_settings().mlflow_tracking_uri)
    main()