"""Pipeline modules for the CIB detection workflow (Steps 2–5 of the System Architecture).

Step 2: collector       — YouTube Data API v3 comment collection
Step 3: preprocessor    — validation, dedup, SHA-256 anonymization, timestamp conversion
Step 4: features        — behavioral feature extraction
        network         — co-commenter graph + network features
        model           — pre-fitted Isolation Forest loader + scorer
        explainer       — SHAP TreeExplainer attribution
Step 5: reporting       — CSV and PDF analyst reports
"""
