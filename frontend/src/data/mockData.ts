const FEATURES = [
  'temporalBurst', 
  'contentRepetition', 
  'replyCount', 
  'commentFrequency', 
  'degreeCentrality', 
  'clusteringCoeff'
];

const generateRealisticShap = (topFeature: string, riskScore: number) => {
  const shap: Record<string, number> = {};
  const topFeatureWeight = riskScore * (0.4 + Math.random() * 0.2);
  shap[topFeature] = topFeatureWeight;
  
  let remainingRisk = riskScore - topFeatureWeight;
  const otherFeatures = FEATURES.filter(f => f !== topFeature);
  
  otherFeatures.forEach((feature, index) => {
    if (index === otherFeatures.length - 1) {
      shap[feature] = remainingRisk;
    } else {
      const weight = remainingRisk * Math.random() * 0.4;
      shap[feature] = weight;
      remainingRisk -= weight;
    }
  });

  return shap;
};

// ─── DATASET BUILDER ───
const buildDataset = (jobId: string, totalCommenters: number, anomalyTarget: number, videoCount: number) => {
  const anomalousCount = Math.floor(totalCommenters * anomalyTarget);
  const organicCount = totalCommenters - anomalousCount;
  
  const contamination = 0.05;

  const overlappingCommenters = totalCommenters < 30 ? 6 : Math.floor(totalCommenters * 0.35);

  const MOCK_TITLES = [
    "Presidential Townhall Debate 2025 Full Coverage",
    "Breaking: Major Policy Shift Announced Live",
    "Election 2025: Candidate Interview Exclusives",
    "Live: Global Economic Forum Keynote Speech",
    "News Panel: Analyzing the Latest Polling Data"
  ];

  const videos = Array.from({ length: videoCount }).map((_, i) => ({
    id: String(i + 1),
    title: MOCK_TITLES[i % MOCK_TITLES.length],
    url: `https://www.youtube.com/watch?v=mock${i + 1}`
  }));

  // Generate ALL commenters with full metrics
  const allCommenters = Array.from({ length: totalCommenters }).map((_, i) => {
    const isAnomalous = i < (anomalousCount > 100 ? 15 : anomalousCount); 
    const riskScore = isAnomalous ? 0.75 + Math.random() * 0.2 : Math.random() * 0.4;
    const topFeature = isAnomalous 
      ? (Math.random() > 0.5 ? 'contentRepetition' : 'temporalBurst') 
      : 'replyCount';

    return {
      id: `node-${i}`,
      hashId: Math.random().toString(36).substring(2, 14),
      riskScore,
      label: isAnomalous ? 'Anomalous' : 'Organic',
      topFeature,
      metrics: {
        commentFrequency: Math.floor(Math.random() * (isAnomalous ? 400 : 50)),
        temporalBurst: Math.floor(Math.random() * (isAnomalous ? 45 : 5)),
        contentRepetition: isAnomalous ? 0.8 + Math.random() * 0.2 : Math.random() * 0.3,
        replyCount: Math.floor(Math.random() * 100),
        degreeCentrality: Math.random(),
        clusteringCoeff: Math.random()
      },
      shapLocal: generateRealisticShap(topFeature, riskScore)
    };
  });

  // Slice the top 100 explicitly for the table/UI lists
  const commenters = allCommenters.slice(0, 100);

  return {
    jobId,
    dateProcessed: new Date().toISOString().split('T')[0], 
    timeProcessed: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit' }) + ' PST',
    totalAnomalous: anomalousCount,
    totalOrganic: organicCount,
    totalCommenters,
    overlappingCommenters,
    anomalyRate: anomalousCount / totalCommenters,
    contamination,
    videos,
    commenters,     
    allCommenters,  
    shapGlobal: commenters[0].shapLocal
  };
};

// ─── DATASET EXPORT ROUTER ───
export const getJobResult = (videoCount: number) => {
  if (videoCount <= 2) {
    return buildDataset('CIB-EDGE-03X', 24, 0.125, videoCount);
  }
  return buildDataset('CIB-9928A', 1200, 0.052, videoCount);
};

export const generateExecutiveSummary = (result: any) => {
  if (!result || !result.commenters) return "Insufficient data for summary generation.";

  const density = result.anomalyRate >= 0.5 ? "high" : "low";
  const topAnomalous = result.commenters.filter((c: any) => c.label === 'Anomalous');
  
  const features = topAnomalous.map((c: any) => c.topFeature);
  const mostCommonFeature = features.sort((a: any,b: any) =>
        features.filter((v: any) => v===a).length
      - features.filter((v: any) => v===b).length
  ).pop() || "suspicious temporal bursts";

  return `The analysis of the provided media indicates a ${density} concentration of coordinated inauthentic behavior (CIB). A cluster of ${result.totalAnomalous} anomalous profiles was detected primarily exhibiting ${mostCommonFeature}. The topology of the network suggests a centralized dissemination strategy, where organic accounts are interacting with peripheral anomalous bots. The contamination parameter of ${result.contamination} was used to bound this evaluation.`;
};