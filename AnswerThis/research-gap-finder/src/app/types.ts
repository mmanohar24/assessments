export type Confidence = "high" | "medium" | "low";

export interface GapCluster {
  theme: string;
  gap: string;
  confidence: Confidence;
  followup_question: string;
}

export interface AnalysisResult {
  clusters: GapCluster[];
  disclaimer?: string;
}
