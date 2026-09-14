"""Step 4 (part 4): SHAP KernelExplainer attribution.

SHAP global and local feature attribution values for every flagged commenter,
matching the thesis specification.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
import shap

from app.pipeline.model import HYBRID_FEATURES, HybridModelBundle

logger = logging.getLogger(__name__)


def compute_shap(
    bundle: HybridModelBundle, scored: pd.DataFrame
) -> tuple[list[dict], dict]:
    """Compute per-commenter and global SHAP attributions.

    Returns
    -------
    per_commenter : list[dict]
        For each row in `scored`, a dict {feature: shap_value}.
    global_shap : dict
        Mean-absolute SHAP per feature aggregated across the supplied rows.
    """
    if scored.empty:
        return [], {f: 0.0 for f in HYBRID_FEATURES}

    X = scored[HYBRID_FEATURES].to_numpy(dtype=float)
    X_scaled = bundle.scaler.transform(X)

    # THESIS CONSTRAINT: KernelExplainer needs an explicit background dataset.
    # We assume 'background_summary' was created via shap.kmeans() and saved in the bundle.
    if getattr(bundle, "background_summary", None) is None:
        raise ValueError(
            "HybridModelBundle is missing 'background_summary'. "
            "KernelExplainer requires a background dataset to function."
        )

    # Wrap the decision_function, NOT the raw estimator, to avoid path-length 
    # interpretation conflicts from Isolation Forest.
    explainer = shap.KernelExplainer(bundle.model.decision_function, bundle.background_summary)
    
    try:
        # THESIS CONSTRAINT: 2 * F + 2048 background perturbation samples per commenter.
        # For F=6 features, nsamples = 2060.
        shap_values = explainer.shap_values(X_scaled, nsamples=2060)
    except Exception as e:
        # CRITICAL FIX: Raise the error instead of silently falling back to zeros.
        logger.error("SHAP KernelExplainer failed (%s). Raising exception to prevent silent zeros.", e)
        raise RuntimeError(f"SHAP KernelExplainer computation failed: {e}") from e

    if isinstance(shap_values, list):
        shap_values = shap_values[0]
    shap_values = np.asarray(shap_values, dtype=float)

    per_commenter: list[dict] = []
    for row in shap_values:
        per_commenter.append({f: float(v) for f, v in zip(HYBRID_FEATURES, row)})

    mean_abs = np.mean(np.abs(shap_values), axis=0)
    global_shap = {f: float(v) for f, v in zip(HYBRID_FEATURES, mean_abs)}
    
    return per_commenter, global_shap