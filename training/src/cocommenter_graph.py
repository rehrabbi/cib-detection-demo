"""Memory-bounded co-commenter graph construction.

WHY THIS EXISTS
---------------
The deployed tool's `build_cocommenter_graph()` (app/pipeline/network.py) is
correct and is what runs in production, where a job covers two videos. It
computes the full co-occurrence matrix `B @ B.T` in one step.

At research scale that single step is not survivable. Dataset A has 443,008
commenters over 7,172 videos, and one video alone carries 17,433 commenters:

    sum of n_v^2 (upper bound on non-zeros) : 3,391,585,640
    restricted to multi-video commenters    : 1,637,677,647  -> ~26 GB peak

This module computes the SAME GRAPH within bounded memory, using two exact
reductions. Neither is an approximation, and `verify_matches_backend()` proves
equivalence against the tool's own function.

REDUCTION 1 - drop provably isolated commenters from the multiplication
    An edge requires co-commenting on >= 2 DISTINCT videos. A commenter who
    appears on only one video can never satisfy that, with anyone, ever. Those
    261,737 commenters are therefore guaranteed to have degree 0. They are
    excluded from the matrix product and added back afterwards as isolated
    nodes, so that degree_centrality = degree / (n - 1) still divides by the
    full 443,008. Same graph, half the work.

REDUCTION 2 - blocked products with immediate thresholding
    Instead of one huge `B @ B.T`, the commenter axis is split into blocks and
    each block pair (i <= j) is multiplied separately. The >= 2 threshold is
    applied to each partial result immediately, so only surviving edges are
    ever retained. Peak memory is set by one block pair, not by the whole
    matrix. Summing partial products over a partition of the rows is exactly
    equal to the full product, so the result is identical.
"""

from __future__ import annotations

import logging

import networkx as nx
import numpy as np
import pandas as pd
import scipy.sparse as sp

log = logging.getLogger("graph")

DEFAULT_BLOCK = 8_000


def _incidence(df: pd.DataFrame) -> tuple[sp.csr_matrix, np.ndarray]:
    """Binary commenter x video incidence matrix, one entry per (commenter, video)."""
    pairs = df[["commenter_hash", "video_id"]].drop_duplicates()
    c_idx, c_keys = pd.factorize(pairs["commenter_hash"])
    v_idx, v_keys = pd.factorize(pairs["video_id"])
    B = sp.csr_matrix(
        (np.ones(len(pairs), dtype=np.float32), (c_idx, v_idx)),
        shape=(len(c_keys), len(v_keys)),
    )
    return B, c_keys.to_numpy()


def build_edges(
    df: pd.DataFrame, min_videos: int, block_size: int = DEFAULT_BLOCK
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Return (u, v, weight, node_keys) for edges among multi-video commenters."""
    # Reduction 1
    per_commenter_videos = df.groupby("commenter_hash")["video_id"].nunique()
    multi = per_commenter_videos.index[per_commenter_videos >= min_videos]
    sub = df[df["commenter_hash"].isin(set(multi))]
    log.info(
        "  graph: %s of %s commenters can possibly form an edge (%.1f%%)",
        f"{len(multi):,}", f"{len(per_commenter_videos):,}",
        100 * len(multi) / len(per_commenter_videos),
    )

    B, keys = _incidence(sub)
    n = B.shape[0]
    if n == 0:
        empty_i = np.array([], dtype=np.int64)
        return empty_i, empty_i, empty_i, keys

    # Reduction 2
    bounds = list(range(0, n, block_size))
    us, vs, ws = [], [], []
    for bi, start_i in enumerate(bounds):
        Bi = B[start_i:start_i + block_size]
        for start_j in bounds[bi:]:
            Bj = B[start_j:start_j + block_size]
            C = (Bi @ Bj.T).tocoo()

            gi = C.row + start_i
            gj = C.col + start_j
            # Upper triangle only, in global index space. This drops self-pairs
            # and prevents counting a pair twice when i == j.
            keep = (gi < gj) & (C.data >= min_videos)
            if keep.any():
                us.append(gi[keep])
                vs.append(gj[keep])
                ws.append(C.data[keep].astype(np.int32))
            del C

    if not us:
        empty_i = np.array([], dtype=np.int64)
        return empty_i, empty_i, empty_i, keys
    return np.concatenate(us), np.concatenate(vs), np.concatenate(ws), keys


def build_graph(
    df: pd.DataFrame, min_videos: int, block_size: int = DEFAULT_BLOCK
) -> nx.Graph:
    """Co-commenter graph over EVERY commenter in df, including isolated ones."""
    u, v, w, keys = build_edges(df, min_videos, block_size)

    g = nx.Graph()
    # All commenters are nodes. Isolated ones must be present or
    # degree_centrality would divide by the wrong n.
    g.add_nodes_from(df["commenter_hash"].unique())
    if len(u):
        g.add_edges_from(zip(keys[u], keys[v], ({"weight": int(x)} for x in w)))
    return g


def verify_matches_backend(df: pd.DataFrame, min_videos: int, block_size: int = 64) -> bool:
    """Prove this module agrees with the deployed tool's implementation.

    A deliberately tiny block_size is used so the blocking logic is genuinely
    exercised rather than trivially reduced to a single block.
    """
    from app.pipeline.network import build_cocommenter_graph, compute_network_features

    reference = build_cocommenter_graph(df, min_videos)
    mine = build_graph(df, min_videos, block_size)

    if set(reference.nodes()) != set(mine.nodes()):
        log.error("node sets differ")
        return False
    ref_edges = {frozenset(e): d.get("weight") for *e, d in reference.edges(data=True)}
    my_edges = {frozenset(e): d.get("weight") for *e, d in mine.edges(data=True)}
    if ref_edges != my_edges:
        log.error("edge sets differ: ref %d vs mine %d", len(ref_edges), len(my_edges))
        return False

    a = compute_network_features(reference).sort_values("commenter_hash").reset_index(drop=True)
    b = compute_network_features(mine).sort_values("commenter_hash").reset_index(drop=True)
    return bool(
        np.allclose(a["degree_centrality"], b["degree_centrality"])
        and np.allclose(a["clustering_coefficient"], b["clustering_coefficient"])
    )


# ---------------------------------------------------------------------------
# Network features at scale
# ---------------------------------------------------------------------------
# compute_network_features() in the deployed tool calls nx.degree_centrality and
# nx.clustering. Both are correct, and at tool scale (two videos) both are
# instant. At research scale nx.clustering is not viable: its cost grows with
# the sum of squared degrees, which for Dataset B alone is 7.16e9. Pure-Python
# triangle enumeration at that size runs for hours.
#
# The identities below give the same numbers using sparse linear algebra.
#
#   degree centrality   c_i = d_i / (n - 1)        n = ALL nodes, isolated included
#   clustering          C_i = 2 T_i / (d_i (d_i - 1))
#
# Triangles are counted EDGE-WISE. For every edge (i, j) the number of common
# neighbours |N(i) & N(j)| is the number of triangles that edge closes. Summing
# that over all edges incident to i counts each triangle at i exactly twice
# (once via edge i-j, once via edge i-k), giving 2 T_i directly.
#
# The obvious alternative, A * (A @ A), was tried first and abandoned: computing
# a row of A @ A materialises that node's entire 2-hop neighbourhood, nearly all
# of which is then discarded by the elementwise product. With a maximum degree
# of 8,434 that is ruinous, and Dataset B had not finished after 12 minutes.
# The edge-wise form only ever intersects two adjacency rows, so the result is
# bounded by min(d_i, d_j) instead of the 2-hop size.

def compute_network_features_fast(
    u: np.ndarray,
    v: np.ndarray,
    keys: np.ndarray,
    all_nodes: np.ndarray,
    nnz_budget: float = 30e6,
) -> pd.DataFrame:
    """Degree centrality and clustering coefficient, identical to NetworkX."""
    n_all = len(all_nodes)
    m = len(keys)

    if m == 0 or len(u) == 0:
        return pd.DataFrame({
            "commenter_hash": all_nodes,
            "degree_centrality": 0.0,
            "clustering_coefficient": 0.0,
        })

    A = sp.csr_matrix(
        (np.ones(len(u) * 2, dtype=np.float32),
         (np.concatenate([u, v]), np.concatenate([v, u]))),
        shape=(m, m),
    )
    A.data[:] = 1.0                     # binary: nx.clustering ignores weights
    # float64 matters: A is float32 to save memory, but a float32 division would
    # carry only ~7 significant digits and leave degree_centrality differing from
    # NetworkX at the 1e-10 level.
    deg = np.asarray(A.sum(axis=1), dtype=np.float64).ravel()

    # Edge-wise triangle counting in DEGREE-SIZED blocks.
    #
    # A[eu] duplicates a row once per incident edge, so the extracted matrix has
    # sum(deg[eu]) non-zeros, not len(eu). With a maximum degree of 8,434 a
    # fixed 250k-edge block can exceed scipy's int32 index limit and fails with
    # "negative dimensions are not allowed". Blocks are therefore cut on
    # cumulative degree, which keeps every extraction inside a fixed budget
    # regardless of how skewed the degree distribution is.
    triangles_x2 = np.zeros(m, dtype=np.float64)
    if len(u):
        edge_cost = deg[u] + deg[v]          # non-zeros A[eu] and A[ev] will hold
        cumulative = np.cumsum(edge_cost)
        start = 0
        while start < len(u):
            spent = cumulative[start - 1] if start > 0 else 0.0
            end = int(np.searchsorted(cumulative, spent + nnz_budget, side="right"))
            end = min(max(end, start + 1), len(u))   # always advance by >=1 edge
            eu, ev = u[start:end], v[start:end]
            common = np.asarray(A[eu].multiply(A[ev]).sum(axis=1)).ravel()
            triangles_x2 += np.bincount(
                np.concatenate([eu, ev]),
                weights=np.concatenate([common, common]),
                minlength=m,
            )
            start = end

    denom = deg * (deg - 1.0)
    clustering = np.divide(
        triangles_x2, denom, out=np.zeros(m, dtype=np.float64), where=denom > 0
    )

    connected = pd.DataFrame({
        "commenter_hash": keys,
        "degree_centrality": deg / (n_all - 1) if n_all > 1 else 0.0,
        "clustering_coefficient": clustering,
    })
    # Isolated commenters were excluded from the multiplication; they are zero
    # on both features by definition, but must appear so counts stay correct.
    # np.setdiff1d sorts, and on object (string) arrays that means Python-level
    # comparisons: 261s for 206k hashes. The hash-based membership test is the
    # same answer in 0.1s, a 4,893x difference measured on Dataset B.
    isolated_nodes = np.asarray(all_nodes)[~pd.Index(all_nodes).isin(keys)]
    isolated = pd.DataFrame({
        "commenter_hash": isolated_nodes,
        "degree_centrality": 0.0,
        "clustering_coefficient": 0.0,
    })
    return pd.concat([connected, isolated], ignore_index=True)
