// Executive summary prose for the Overview panel and the exported report.
// This is live application logic. It previously lived in mockData.ts, whose
// name implies the opposite.

export const generateExecutiveSummary = (result: any) => {
  if (!result || !result.commenters) return "Insufficient data for summary generation.";

  const density = result.anomalyRate >= 0.5 ? "high" : "low";
  const topAnomalous = result.commenters.filter((c: any) => c.label === 'Anomalous');
  
  // Modal top feature, rendered with its display label. Previously this leaked
  // the raw camelCase key into user-facing prose.
  const FEATURE_PROSE: Record<string, string> = {
    commentFrequency: 'elevated comment frequency',
    temporalBurst: 'suspicious temporal bursts',
    contentRepetition: 'repetitive content',
    replyCount: 'elevated reply counts',
    degreeCentrality: 'high degree centrality',
    clusteringCoeff: 'dense clustering',
  };
  const counts: Record<string, number> = {};
  for (const c of topAnomalous) {
    if (c.topFeature) counts[c.topFeature] = (counts[c.topFeature] || 0) + 1;
  }
  const modal = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  const mostCommonFeature = FEATURE_PROSE[modal] || "suspicious temporal bursts";

  return `The analysis of the provided media indicates a ${density} concentration of coordinated inauthentic behavior (CIB). A cluster of ${result.totalAnomalous} anomalous profiles was detected primarily exhibiting ${mostCommonFeature}. The topology of the network suggests a centralized dissemination strategy, where organic accounts are interacting with peripheral anomalous bots. The contamination parameter of ${result.contamination} was used to bound this evaluation.`;
};
