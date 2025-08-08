export interface CleaningReport {
  originalRows: number;
  cleanedRows: number;
  removedDuplicates: number;
  handledMissingValues: number;
  outliersTreated: number;
  dataTypeCorrections: number;
  cleaningActions: string[];
}

export interface Dataset {
  fileName: string;
  data: Record<string, any>[];
  columns: string[];
  rowCount: number;
  fileSize: string;
  uploadedAt: Date;
  cleaningReport?: CleaningReport;
}

export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'boolean';
  uniqueValues: number;
  nullCount: number;
  nullPercentage: number;
  sampleValues: any[];
}

export interface NumericStats {
  mean: number;
  median: number;
  mode: number | null;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
}

export interface CategoricalStats {
  topCategories: Array<{ value: string; count: number; percentage: number }>;
  uniqueCount: number;
  mostFrequent: string;
  leastFrequent: string;
}

export interface Correlation {
  column1: string;
  column2: string;
  coefficient: number;
  strength: 'weak' | 'moderate' | 'strong';
  direction: 'positive' | 'negative';
}

export interface Insight {
  type: 'anomaly' | 'correlation' | 'distribution' | 'quality' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  column?: string;
  value?: any;
}

export interface AnalysisResult {
  summary: {
    totalRows: number;
    totalColumns: number;
    numericColumns: number;
    categoricalColumns: number;
    missingValuePercentage: number;
    duplicateRows: number;
  };
  columns: ColumnInfo[];
  numericStats: Record<string, NumericStats>;
  categoricalStats: Record<string, CategoricalStats>;
  correlations: Correlation[];
  insights: Insight[];
  qualityScore: number;
  recommendations: string[];
}