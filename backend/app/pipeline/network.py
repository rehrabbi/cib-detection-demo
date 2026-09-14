"""Step 4 (part 2): Co-commenter graph construction + network features.

Per thesis:
- Each unique commenter is a node.
- An undirected edge connects two commenters who co-commented across at least
  EDGE_MIN_COCOMMENTED_VIDEOS distinct videos (default 2).
- Computed features: degree centrality, clustering coefficient.
"""

from __future__ import annotations

import networkx as nx
import numpy as np
import pandas as pd
import scipy.sparse as sp

NETWORK_FEATURES = ["degree_centrality", "clustering_coefficient"]


def build_cocommenter_graph(df: pd.DataFrame, edge_min_cocommented_videos: int) -> nx.Graph:
    """Construct the undirected co-commenter graph using a sparse bipartite matrix."""
    g = nx.Graph()
    if df.empty:
        return g

    # Ensure we only count a user once per video (binary interaction)
    df_clean = df.drop_duplicates(subset=["commenter_hash", "video_id"])
    if df_clean.empty:
        return g

    # Fast integer mapping for commenters and videos
    commenter_idx, commenter_keys = pd.factorize(df_clean["commenter_hash"])
    video_idx, video_keys = pd.factorize(df_clean["video_id"])

    n_commenters = len(commenter_keys)
    n_videos = len(video_keys)

    # THESIS CONSTRAINT: Every unique commenter must be a node, even if they 
    # end up with 0 edges after pruning, so centrality calculates correctly.
    g.add_nodes_from(commenter_keys)

    if n_commenters == 0 or n_videos == 0:
        return g

    # Build sparse bipartite matrix (Commenters x Videos)
    B = sp.csr_matrix(
        (np.ones(len(df_clean)), (commenter_idx, video_idx)), 
        shape=(n_commenters, n_videos)
    )

    # Multiply B by B.T to get co-commenter frequencies
    C = (B @ B.T).tocoo()

    # Filter for upper triangle to avoid duplicate edges and self-loops,
    # AND enforce the minimum shared videos threshold
    mask = (C.row < C.col) & (C.data >= edge_min_cocommented_videos)

    # Map integer indices back to the original hashed string IDs
    u_nodes = commenter_keys[C.row[mask]]
    v_nodes = commenter_keys[C.col[mask]]
    weights = C.data[mask]

    edges = [
        (u, v, {"weight": int(w)}) 
        for u, v, w in zip(u_nodes, v_nodes, weights)
    ]
    g.add_edges_from(edges)

    return g


def compute_network_features(graph: nx.Graph) -> pd.DataFrame:
    """Compute degree centrality and clustering coefficient for every node."""
    if graph.number_of_nodes() == 0:
        return pd.DataFrame(columns=["commenter_hash"] + NETWORK_FEATURES)

    degree_c = nx.degree_centrality(graph)
    clustering = nx.clustering(graph)

    rows = []
    for node in graph.nodes():
        rows.append(
            {
                "commenter_hash": node,
                "degree_centrality": float(degree_c.get(node, 0.0)),
                "clustering_coefficient": float(clustering.get(node, 0.0)),
            }
        )
    return pd.DataFrame(rows)


def graph_to_cytoscape(graph: nx.Graph, classifications: dict[str, str]) -> dict:
    """Convert the NetworkX graph into a Cytoscape.js-compatible elements payload."""
    elements = []
    for node in graph.nodes():
        elements.append(
            {
                "data": {
                    "id": node,
                    "label": node[:8],
                    "classification": classifications.get(node, "Organic"),
                }
            }
        )
    for u, v, data in graph.edges(data=True):
        elements.append(
            {
                "data": {
                    "id": f"{u}__{v}",
                    "source": u,
                    "target": v,
                    "weight": data.get("weight", 1),
                }
            }
        )
    return {"elements": elements}