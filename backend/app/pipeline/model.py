"""Step 4 (part 3): pre-fitted Isolation Forest loader and scoring.

The hybrid behavioral-network Isolation Forest, together with the standard scaler
that was fit on the 80% training portion of Dataset A, is loaded here once and
re-used for every detection job. Per thesis: no refitting or parameter adjustment
occurs at detection time.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

HYBRID_FEATURES = [
    "commenting_frequency",
    "temporal_burst_activity",
    "tfidf_content_repetition",
    "reply_count",
    "degree_centrality",
    "clustering_coefficient",
]


class HybridModelBundle:
    """Loads the joblib-serialized artifacts once and caches them."""

    _lock = threading.Lock()
    _instance: "HybridModelBundle | None" = None

    def __init__(
        self,
        scaler: StandardScaler,
        model: IsolationForest,
        background_summary: np.ndarray,
        d_min_train: float,
        d_max_train: float,
    ):
        self.scaler = scaler
        self.model = model
        self.background_summary = background_summary
        self.d_min_train = d_min_train
        self.d_max_train = d_max_train

    @classmethod
    def load(cls, scaler_path: str | Path, model_path: str | Path) -> "HybridModelBundle":
        with cls._lock:
            if cls._instance is None:
                scaler = joblib.load(scaler_path)
                
                # We assume the model training script saves a dictionary containing 
                # the model, the background summary, and the score bounds.
                model_artifact = joblib.load(model_path)
                
                # If the artifact is just the raw model (from an old build), handle it gracefully
                # though training scripts MUST be updated to save the dict structure.
                if isinstance(model_artifact, dict):
                    model = model_artifact["model"]
                    background_summary = model_artifact.get("background_summary")
                    d_min_train = model_artifact.get("d_min_train", -0.5) # Default fallback
                    d_max_train = model_artifact.get("d_max_train", 0.5)  # Default fallback
                else:
                    model = model_artifact
                    background_summary = None
                    # Fallback values if bounds weren't saved
                    d_min_train, d_max_train = -0.5, 0.5 
                    logger.warning("Loaded old model format. SHAP and Risk Scores may fail or be inaccurate.")

                logger.info("Loaded model %s with scaler %s", model_path, scaler_path)
                cls._instance = cls(
                    scaler=scaler, 
                    model=model,
                    background_summary=background_summary,
                    d_min_train=d_min_train,
                    d_max_train=d_max_train
                )
            return cls._instance

    @classmethod
    def reset(cls) -> None:
        with cls._lock:
            cls._instance = None

    def score(self, features: pd.DataFrame) -> pd.DataFrame:
        """Apply the early-fusion hybrid scoring pipeline.

        Returns the input features augmented with anomaly_score, cib_risk_score, and
        classification ("Anomalous" or "Organic").
        """
        if features.empty:
            return features.assign(anomaly_score=[], cib_risk_score=[], classification=[])

        X = features[HYBRID_FEATURES].to_numpy(dtype=float)
        X_scaled = self.scaler.transform(X)

        # decision_function: larger = more normal. 
        decision = self.model.decision_function(X_scaled)
        labels = self.model.predict(X_scaled)  # 1 = inlier, -1 = outlier
        
        # THESIS CONSTRAINT: CIB risk score is NO LONGER batch-relative.
        # It uses fixed transforms frozen at training time for reproducibility.
        if self.d_max_train - self.d_min_train < 1e-12:
            risk = np.full_like(decision, 0.5, dtype=float)
        else:
            # Clip the normalized score so outliers beyond the training set stay within [0.0, 1.0]
            risk = np.clip(
                (self.d_max_train - decision) / (self.d_max_train - self.d_min_train), 
                0.0, 
                1.0
            )

        out = features.copy()
        out["anomaly_score"] = decision.astype(float)
        out["cib_risk_score"] = risk.astype(float)
        out["classification"] = np.where(labels == -1, "Anomalous", "Organic")
        return out