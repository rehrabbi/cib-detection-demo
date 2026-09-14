"""Step 5: Analyst report generation (CSV and PDF)."""

from __future__ import annotations

import csv
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.pipeline.model import HYBRID_FEATURES


def commenters_to_csv(rows: list[dict]) -> bytes:
    """Render per-commenter results into a CSV byte stream."""
    columns = [
        "commenter_hash",
        *HYBRID_FEATURES,
        "anomaly_score",
        "cib_risk_score",
        "classification",
    ]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k, "") for k in columns})
    return buffer.getvalue().encode("utf-8")


def commenters_to_pdf(
    rows: list[dict],
    summary: dict,
    global_shap: dict,
    job_meta: dict,
) -> bytes:
    """Render a PDF analyst report. Mirrors the thesis-defined output."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="CIB Detection Analyst Report",
    )
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("CIB Detection Analyst Report", styles["Title"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(
        Paragraph(
            "Hybrid Behavioral-Network Isolation Forest with SHAP Attribution",
            styles["Italic"],
        )
    )
    story.append(Spacer(1, 0.2 * inch))

    meta_rows = [
        ["Job ID", job_meta.get("job_id", "")],
        ["Created", job_meta.get("created_at", "")],
        ["Video 1", job_meta.get("video_id_1", "")],
        ["Video 2", job_meta.get("video_id_2", "")],
        ["Used sample data", str(job_meta.get("used_sample_data", False))],
        ["Total commenters", str(summary.get("total_commenters", 0))],
        ["Anomalous", str(summary.get("anomalous", 0))],
        ["Organic", str(summary.get("organic", 0))],
        ["Anomaly Detection Rate", f"{summary.get('anomaly_detection_rate', 0.0):.4f}"],
    ]
    meta_table = Table(meta_rows, colWidths=[2.0 * inch, 4.5 * inch])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 0.25 * inch))

    story.append(Paragraph("Global SHAP Feature Contribution (mean |value|)", styles["Heading2"]))
    shap_rows = [["Feature", "Mean |SHAP|"]]
    for feature in HYBRID_FEATURES:
        shap_rows.append([feature, f"{global_shap.get(feature, 0.0):.4f}"])
    shap_table = Table(shap_rows, colWidths=[3.0 * inch, 1.5 * inch])
    shap_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
            ]
        )
    )
    story.append(shap_table)
    story.append(Spacer(1, 0.25 * inch))

    story.append(Paragraph("Top 30 Commenters by CIB Risk Score", styles["Heading2"]))
    header = [
        "Commenter (SHA-256)",
        "Class",
        "Risk",
        "Freq",
        "Burst",
        "TF-IDF",
        "Replies",
        "DegCen",
        "Cluster",
    ]
    top = sorted(rows, key=lambda r: r.get("cib_risk_score", 0.0), reverse=True)[:30]
    table_rows = [header]
    for r in top:
        table_rows.append(
            [
                str(r.get("commenter_hash", ""))[:16] + "…",
                r.get("classification", ""),
                f"{r.get('cib_risk_score', 0):.3f}",
                f"{r.get('commenting_frequency', 0):.0f}",
                f"{r.get('temporal_burst_activity', 0):.0f}",
                f"{r.get('tfidf_content_repetition', 0):.3f}",
                f"{r.get('reply_count', 0):.0f}",
                f"{r.get('degree_centrality', 0):.3f}",
                f"{r.get('clustering_coefficient', 0):.3f}",
            ]
        )
    results_table = Table(
        table_rows,
        colWidths=[
            1.7 * inch,
            0.7 * inch,
            0.55 * inch,
            0.55 * inch,
            0.55 * inch,
            0.6 * inch,
            0.55 * inch,
            0.6 * inch,
            0.6 * inch,
        ],
        repeatRows=1,
    )
    results_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.whitesmoke, colors.white],
                ),
            ]
        )
    )
    story.append(results_table)
    story.append(Spacer(1, 0.2 * inch))

    story.append(
        Paragraph(
            "<i>Outputs are investigative indicators only and do not constitute a definitive "
            "or legally binding determination of inauthenticity. See thesis (Group 4, PUP CCIS, "
            "May 2026) for methodology and limitations.</i>",
            styles["Italic"],
        )
    )

    doc.build(story)
    return buffer.getvalue()
