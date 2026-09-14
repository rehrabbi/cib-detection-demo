"""Step 4 (part 2): Co-commenter graph construction + network features.

Per thesis:
- Each unique commenter is a node.
- An undirected edge connects two commenters who co-commented across at least
  EDGE_MIN_COCOMMENTED_VIDEOS distinct videos (default 2).
- Computed features: degree centrality, clustering coefficient.
"""

from __future__ import annotations

import logging

import networkx as nx
import numpy as np
import pandas as pd
import scipy.sparse as sp

logger = logging.getLogger(__name__)

NETWORK_FEATURES = ["degree_centrality", "clustering_coefficient"]


DEFAULT_BLOCK = 8_000


def build_cocommenter_graph(
    df: pd.DataFrame,
    edge_min_cocommented_videos: int,
    block_size: int = DEFAULT_BLOCK,
) -> nx.Graph:
    """Construct the undirected co-commenter graph using a sparse bipartite matrix.

    The graph is identical to a direct ``B @ B.T`` followed by thresholding. Two
    exact reductions keep the intermediate bounded, because the direct form
    materialises a non-zero for every pair of commenters sharing at least one
    video, before the threshold has removed any of them.

    Reduction 1, drop commenters that cannot possibly form an edge.
        An edge requires co-commenting on at least
        ``edge_min_cocommented_videos`` distinct videos. A commenter appearing
        on fewer videos than that can never satisfy it, with anyone. Those
        commenters are excluded from the product and added back afterwards as
        isolated nodes, so degree_centrality still divides by the full node
        count. On a two-video job this is the whole fix: only commenters present
        on both videos survive, which is typically a few hundred out of many
        thousands.

    Reduction 2, blocked products with immediate thresholding.
        The commenter axis is split into blocks and each block pair is
        multiplied separately, applying the threshold to each partial result at
        once. Summing partial products over a partition of the rows equals the
        full product exactly, so the edge set is unchanged.
    """
    g = nx.Graph()
    if df.empty:
        return g

    # Ensure we only count a user once per video (binary interaction)
    df_clean = df.drop_duplicates(subset=["commenter_hash", "video_id"])
    if df_clean.empty:
        return g

    # THESIS CONSTRAINT: Every unique commenter must be a node, even if they
    # end up with 0 edges after pruning, so centrality calculates correctly.
    all_commenters = df_clean["commenter_hash"].unique()
    g.add_nodes_from(all_commenters)

    # --- Reduction 1 ---
    videos_per_commenter = df_clean.groupby("commenter_hash")["video_id"].nunique()
    eligible = videos_per_commenter.index[
        videos_per_commenter >= edge_min_cocommented_videos
    ]
    if len(eligible) == 0:
        return g

    sub = df_clean[df_clean["commenter_hash"].isin(set(eligible))]
    logger.info(
        "Co-commenter graph: %d of %d commenters can possibly form an edge (%.1f%%)",
        len(eligible),
        len(videos_per_commenter),
        100 * len(eligible) / max(len(videos_per_commenter), 1),
    )

    commenter_idx, commenter_keys = pd.factorize(sub["commenter_hash"])
    video_idx, video_keys = pd.factorize(sub["video_id"])
    n_commenters = len(commenter_keys)
    if n_commenters == 0 or len(video_keys) == 0:
        return g

    B = sp.csr_matrix(
        (np.ones(len(sub), dtype=np.float32), (commenter_idx, video_idx)),
        shape=(n_commenters, len(video_keys)),
    )

    # --- Reduction 2 ---
    bounds = list(range(0, n_commenters, block_size))
    edges: list[tuple] = []
    for bi, start_i in enumerate(bounds):
        Bi = B[start_i:start_i + block_size]
        for start_j in bounds[bi:]:
            Bj = B[start_j:start_j + block_size]
            C = (Bi @ Bj.T).tocoo()

            gi = C.row + start_i
            gj = C.col + start_j
            # Upper triangle in global index space. Drops self-pairs and stops a
            # pair being counted twice when the two blocks are the same block.
            keep = (gi < gj) & (C.data >= edge_min_cocommented_videos)
            if keep.any():
                u_nodes = commenter_keys[gi[keep]]
                v_nodes = commenter_keys[gj[keep]]
                weights = C.data[keep]
                edges.extend(
                    (u, v, {"weight": int(w)})
                    for u, v, w in zip(u_nodes, v_nodes, weights)
                )
            del C

    g.add_edges_from(edges)
    return g


TRIANGLE_NNZ_BUDGET = 30e6


def compute_network_features(graph: nx.Graph) -> pd.DataFrame:
    """Compute degree centrality and clustering coefficient for every node.

    Produces exactly the values ``nx.degree_centrality`` and ``nx.clustering``
    produce, using sparse linear algebra instead of Python-level triangle
    enumeration.

    ``nx.clustering`` costs roughly the sum of squared degrees, which is fine on
    a sparse graph and ruinous on a dense one. A two-video job makes the
    connected part a clique, because an edge requires co-commenting on both
    videos and everyone who did is therefore connected to everyone else who did.
    Measured on complete graphs: 215 nodes 0.33s, 1,000 nodes 29s, 2,084 nodes
    348s.

    Identities used:
        degree centrality   c_i = d_i / (n - 1)     n counts every node
        clustering          C_i = 2 T_i / (d_i (d_i - 1))

    Triangles are counted edge-wise. For each edge (i, j) the number of common
    neighbours is the number of triangles that edge closes. Summing over the
    edges incident to i counts each triangle at i exactly twice, which is 2 T_i.
    The elementwise product only ever intersects two adjacency rows, so cost is
    bounded by min(d_i, d_j) rather than by the size of i's 2-hop neighbourhood.
    """
    if graph.number_of_nodes() == 0:
        return pd.DataFrame(columns=["commenter_hash"] + NETWORK_FEATURES)

    nodes = list(graph.nodes())
    n_all = len(nodes)

    if graph.number_of_edges() == 0 or n_all < 2:
        return pd.DataFrame(
            {
                "commenter_hash": nodes,
                "degree_centrality": np.zeros(n_all, dtype=np.float64),
                "clustering_coefficient": np.zeros(n_all, dtype=np.float64),
            }
        )

    position = {node: i for i, node in enumerate(nodes)}
    edge_list = list(graph.edges())
    u = np.fromiter((position[a] for a, _ in edge_list), dtype=np.int64, count=len(edge_list))
    v = np.fromiter((position[b] for _, b in edge_list), dtype=np.int64, count=len(edge_list))

    A = sp.csr_matrix(
        (
            np.ones(len(u) * 2, dtype=np.float32),
            (np.concatenate([u, v]), np.concatenate([v, u])),
        ),
        shape=(n_all, n_all),
    )
    # Binary: nx.clustering ignores edge weights.
    A.data[:] = 1.0

    # float64 here matters. A is float32 to save memory, but dividing in float32
    # carries only about seven significant digits and leaves degree_centrality
    # differing from NetworkX around 1e-10.
    deg = np.asarray(A.sum(axis=1), dtype=np.float64).ravel()

    # A[eu] repeats a row once per incident edge, so an extraction holds
    # sum(deg[eu]) non-zeros rather than len(eu). A fixed edge-count block can
    # therefore exceed scipy's int32 index limit on a high-degree graph. Blocks
    # are cut on cumulative degree so every extraction stays inside a budget
    # however skewed the degree distribution is.
    triangles_x2 = np.zeros(n_all, dtype=np.float64)
    edge_cost = deg[u] + deg[v]
    cumulative = np.cumsum(edge_cost)
    start = 0
    while start < len(u):
        spent = cumulative[start - 1] if start > 0 else 0.0
        stop = int(np.searchsorted(cumulative, spent + TRIANGLE_NNZ_BUDGET, side="right"))
        stop = min(max(stop, start + 1), len(u))  # always advance by at least one edge
        eu, ev = u[start:stop], v[start:stop]
        common = np.asarray(A[eu].multiply(A[ev]).sum(axis=1)).ravel()
        triangles_x2 += np.bincount(
            np.concatenate([eu, ev]),
            weights=np.concatenate([common, common]),
            minlength=n_all,
        )
        start = stop

    denom = deg * (deg - 1.0)
    clustering = np.divide(
        triangles_x2, denom, out=np.zeros(n_all, dtype=np.float64), where=denom > 0
    )

    return pd.DataFrame(
        {
            "commenter_hash": nodes,
            "degree_centrality": deg / (n_all - 1),
            "clustering_coefficient": clustering,
        }
    )


# Upper bounds on the serialised graph. The co-commenter graph of a two-video
# job is a clique among commenters present on both videos, so its edge count
# grows quadratically with overlap: 2,084 shared commenters produce 2,170,486
# edges, which serialise to roughly 712 MB of JSON and exceed PostgreSQL's 1 GB
# limit for a single value. The job then completes its analysis and dies on the
# final write. The viewer renders a few hundred nodes at most, so the stored
# graph is bounded and the true totals are recorded alongside it.
MAX_CYTOSCAPE_NODES = 600
MAX_CYTOSCAPE_EDGES = 25_000


def graph_to_cytoscape(
    graph: nx.Graph,
    classifications: dict[str, str],
    max_nodes: int = MAX_CYTOSCAPE_NODES,
    max_edges: int = MAX_CYTOSCAPE_EDGES,
) -> dict:
    """Convert the NetworkX graph into a Cytoscape.js-compatible elements payload.

    Returns the elements plus a ``stats`` block carrying the real totals, so a
    truncated render can still report the true size of the graph rather than the
    size of the excerpt.
    """
    degrees = dict(graph.degree())
    connected = [n for n, d in degrees.items() if d > 0]
    isolated_count = graph.number_of_nodes() - len(connected)

    # Highest degree first: those carry the structure worth looking at.
    connected.sort(key=lambda n: degrees[n], reverse=True)
    kept_connected = connected[:max_nodes]

    # A little isolated context, so the viewer can see they exist.
    remaining = max(max_nodes - len(kept_connected), 0)
    kept_isolated = [n for n, d in degrees.items() if d == 0][:min(remaining, 60)]

    kept = kept_connected + kept_isolated
    kept_set = set(kept)

    elements = [
        {
            "data": {
                "id": node,
                "label": node[:8],
                "classification": classifications.get(node, "Organic"),
            }
        }
        for node in kept
    ]

    edge_count = 0
    for u, v, data in graph.edges(data=True):
        if u in kept_set and v in kept_set:
            if edge_count >= max_edges:
                break
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
            edge_count += 1

    return {
        "elements": elements,
        "stats": {
            "total_nodes": graph.number_of_nodes(),
            "total_edges": graph.number_of_edges(),
            "connected_nodes": len(connected),
            "isolated_nodes": isolated_count,
            "rendered_nodes": len(kept),
            "rendered_edges": edge_count,
            "truncated": (
                len(kept) < graph.number_of_nodes()
                or edge_count < graph.number_of_edges()
            ),
        },
    }
