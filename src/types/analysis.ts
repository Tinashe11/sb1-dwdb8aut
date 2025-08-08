export interface Dataset {
  headers: string[];
  rows: any[];
  metadata?: {
    rowCount: number;
    columnCount: number;
    sourceType: string;
  };
}

export interface AnalysisResult {
  summaryStatistics?: Record<string, any>;
  visualizations?: any[];
  insights?: string[];
  correlations?: Record<string, number>;
  // Add other analysis results as needed
}
