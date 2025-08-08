import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Dataset, AnalysisResult, ColumnInfo, NumericStats, CategoricalStats, Correlation, Insight } from '../types/analysis';

export interface CleaningReport {
  originalRows: number;
  cleanedRows: number;
  removedDuplicates: number;
  handledMissingValues: number;
  outliersTreated: number;
  dataTypeCorrections: number;
  cleaningActions: string[];
}

export async function parseDataset(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          const data = Array.isArray(jsonData) ? jsonData : [jsonData];
          const columns = data.length > 0 ? Object.keys(data[0]) : [];
          
          resolve({
            fileName: file.name,
            data,
            columns,
            rowCount: data.length,
            fileSize: formatFileSize(file.size),
            uploadedAt: new Date(),
          });
        } catch (error) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with header row
          const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: null,
            raw: false
          }) as any[][];
          
          if (rawData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }
          
          // First row as headers
          const headers = rawData[0].map((header: any) => String(header).trim());
          const dataRows = rawData.slice(1);
          
          // Convert to object format and transform values
          const data = dataRows.map(row => {
            const obj: Record<string, any> = {};
            headers.forEach((header, index) => {
              let value = row[index];
              
              // Transform values
              if (value === null || value === undefined || value === '') {
                obj[header] = null;
              } else {
                const stringValue = String(value).trim();
                // Try to convert to number
                const num = Number(stringValue);
                if (!isNaN(num) && stringValue !== '') {
                  obj[header] = num;
                } else if (stringValue.toLowerCase() === 'true') {
                  obj[header] = true;
                } else if (stringValue.toLowerCase() === 'false') {
                  obj[header] = false;
                } else {
                  obj[header] = stringValue;
                }
              }
            });
            return obj;
          }).filter(row => Object.values(row).some(val => val !== null && val !== ''));
          
          // Apply automatic data cleaning
          const { cleanedData, cleaningReport } = cleanDataset(data, headers);
          
          resolve({
            fileName: file.name,
            data: cleanedData,
            columns: headers,
            rowCount: cleanedData.length,
            fileSize: formatFileSize(file.size),
            uploadedAt: new Date(),
            cleaningReport,
          });
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file format. Please upload an Excel (.xlsx, .xls) or JSON file.'));
    }
  });
}

function cleanDataset(data: Record<string, any>[], columns: string[]): { cleanedData: Record<string, any>[], cleaningReport: CleaningReport } {
  const originalRows = data.length;
  const cleaningActions: string[] = [];
  let removedDuplicates = 0;
  let handledMissingValues = 0;
  let outliersTreated = 0;
  let dataTypeCorrections = 0;
  
  let cleanedData = [...data];
  
  // Step 1: Remove completely empty rows
  const beforeEmptyRemoval = cleanedData.length;
  cleanedData = cleanedData.filter(row => 
    Object.values(row).some(val => val !== null && val !== undefined && val !== '')
  );
  if (beforeEmptyRemoval > cleanedData.length) {
    const removed = beforeEmptyRemoval - cleanedData.length;
    cleaningActions.push(`Removed ${removed} completely empty rows`);
  }
  
  // Step 2: Remove duplicate rows
  const seen = new Set();
  const beforeDuplicateRemoval = cleanedData.length;
  cleanedData = cleanedData.filter(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  removedDuplicates = beforeDuplicateRemoval - cleanedData.length;
  if (removedDuplicates > 0) {
    cleaningActions.push(`Removed ${removedDuplicates} duplicate rows`);
  }
  
  // Step 3: Analyze columns for cleaning
  const columnAnalysis = analyzeColumnsForCleaning(cleanedData, columns);
  
  // Step 4: Handle missing values
  cleanedData = cleanedData.map(row => {
    const cleanedRow = { ...row };
    columns.forEach(col => {
      if (cleanedRow[col] === null || cleanedRow[col] === undefined || cleanedRow[col] === '') {
        const colInfo = columnAnalysis[col];
        if (colInfo.type === 'numeric') {
          // Use median for numeric columns
          cleanedRow[col] = colInfo.median || 0;
          handledMissingValues++;
        } else if (colInfo.type === 'categorical') {
          // Use mode for categorical columns
          cleanedRow[col] = colInfo.mode || 'Unknown';
          handledMissingValues++;
        } else if (colInfo.type === 'boolean') {
          cleanedRow[col] = false;
          handledMissingValues++;
        }
      }
    });
    return cleanedRow;
  });
  
  if (handledMissingValues > 0) {
    cleaningActions.push(`Filled ${handledMissingValues} missing values using statistical imputation`);
  }
  
  // Step 5: Handle outliers in numeric columns
  columns.forEach(col => {
    const colInfo = columnAnalysis[col];
    if (colInfo.type === 'numeric' && colInfo.values.length > 10) {
      const q1 = colInfo.q1 || 0;
      const q3 = colInfo.q3 || 0;
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      let outliersFound = 0;
      cleanedData = cleanedData.map(row => {
        const value = row[col];
        if (typeof value === 'number' && (value < lowerBound || value > upperBound)) {
          outliersFound++;
          // Cap outliers to the bounds
          return { ...row, [col]: value < lowerBound ? lowerBound : upperBound };
        }
        return row;
      });
      
      if (outliersFound > 0) {
        outliersTreated += outliersFound;
        cleaningActions.push(`Capped ${outliersFound} outliers in column "${col}"`);
      }
    }
  });
  
  // Step 6: Standardize data types
  cleanedData = cleanedData.map(row => {
    const cleanedRow = { ...row };
    columns.forEach(col => {
      const colInfo = columnAnalysis[col];
      const value = cleanedRow[col];
      
      if (colInfo.type === 'numeric' && typeof value !== 'number') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          cleanedRow[col] = numValue;
          dataTypeCorrections++;
        }
      } else if (colInfo.type === 'boolean' && typeof value !== 'boolean') {
        const strValue = String(value).toLowerCase();
        if (['true', '1', 'yes', 'y'].includes(strValue)) {
          cleanedRow[col] = true;
          dataTypeCorrections++;
        } else if (['false', '0', 'no', 'n'].includes(strValue)) {
          cleanedRow[col] = false;
          dataTypeCorrections++;
        }
      }
    });
    return cleanedRow;
  });
  
  if (dataTypeCorrections > 0) {
    cleaningActions.push(`Corrected ${dataTypeCorrections} data type inconsistencies`);
  }
  
  // Step 7: Remove rows with too many missing values (>50% missing)
  const beforeMissingRowRemoval = cleanedData.length;
  cleanedData = cleanedData.filter(row => {
    const nonNullValues = Object.values(row).filter(val => val !== null && val !== undefined && val !== '').length;
    return nonNullValues / columns.length >= 0.5;
  });
  
  if (beforeMissingRowRemoval > cleanedData.length) {
    const removed = beforeMissingRowRemoval - cleanedData.length;
    cleaningActions.push(`Removed ${removed} rows with >50% missing data`);
  }
  
  const cleaningReport: CleaningReport = {
    originalRows,
    cleanedRows: cleanedData.length,
    removedDuplicates,
    handledMissingValues,
    outliersTreated,
    dataTypeCorrections,
    cleaningActions,
  };
  
  return { cleanedData, cleaningReport };
}

function analyzeColumnsForCleaning(data: Record<string, any>[], columns: string[]) {
  const analysis: Record<string, any> = {};
  
  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    const numericValues = values.filter(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''));
    
    let type = 'categorical';
    if (numericValues.length / values.length > 0.7) {
      type = 'numeric';
    } else if (values.some(v => typeof v === 'boolean' || ['true', 'false', '1', '0', 'yes', 'no'].includes(String(v).toLowerCase()))) {
      type = 'boolean';
    }
    
    // Calculate statistics for imputation
    let median, mode, q1, q3;
    
    if (type === 'numeric') {
      const nums = numericValues.map(v => Number(v)).sort((a, b) => a - b);
      median = nums[Math.floor(nums.length / 2)];
      q1 = nums[Math.floor(nums.length * 0.25)];
      q3 = nums[Math.floor(nums.length * 0.75)];
    } else {
      // Find mode for categorical data
      const frequency: Record<string, number> = {};
      values.forEach(v => {
        const key = String(v);
        frequency[key] = (frequency[key] || 0) + 1;
      });
      mode = Object.entries(frequency).reduce((a, b) => frequency[a[0]] > frequency[b[0]] ? a : b)[0];
    }
    
    analysis[col] = {
      type,
      values,
      median,
      mode,
      q1,
      q3,
    };
  });
  
  return analysis;
}

export function analyzeData(dataset: Dataset): AnalysisResult {
  const columns = analyzeColumns(dataset);
  const numericColumns = columns.filter(col => col.type === 'numeric');
  const categoricalColumns = columns.filter(col => col.type === 'categorical');
  
  const numericStats = calculateNumericStats(dataset, numericColumns);
  const categoricalStats = calculateCategoricalStats(dataset, categoricalColumns);
  const correlations = calculateCorrelations(dataset, numericColumns);
  const insights = generateInsights(dataset, columns, numericStats, categoricalStats, correlations);
  const qualityScore = calculateQualityScore(columns);
  const recommendations = generateRecommendations(dataset, columns, insights);
  
  return {
    summary: {
      totalRows: dataset.rowCount,
      totalColumns: dataset.columns.length,
      numericColumns: numericColumns.length,
      categoricalColumns: categoricalColumns.length,
      missingValuePercentage: columns.reduce((sum, col) => sum + col.nullPercentage, 0) / columns.length,
      duplicateRows: findDuplicateRows(dataset),
    },
    columns,
    numericStats,
    categoricalStats,
    correlations,
    insights,
    qualityScore,
    recommendations,
  };
}

function analyzeColumns(dataset: Dataset): ColumnInfo[] {
  return dataset.columns.map(columnName => {
    const values = dataset.data.map(row => row[columnName]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNullValues).size;
    const nullCount = values.length - nonNullValues.length;
    const nullPercentage = (nullCount / values.length) * 100;
    
    // Determine column type
    let type: ColumnInfo['type'] = 'categorical';
    const numericValues = nonNullValues.filter(v => typeof v === 'number' && !isNaN(v));
    
    if (numericValues.length / nonNullValues.length > 0.8) {
      type = 'numeric';
    } else if (nonNullValues.some(v => v === true || v === false)) {
      type = 'boolean';
    } else if (nonNullValues.some(v => isDateString(v))) {
      type = 'datetime';
    }
    
    return {
      name: columnName,
      type,
      uniqueValues,
      nullCount,
      nullPercentage,
      sampleValues: nonNullValues.slice(0, 5),
    };
  });
}

function calculateNumericStats(dataset: Dataset, numericColumns: ColumnInfo[]): Record<string, NumericStats> {
  const stats: Record<string, NumericStats> = {};
  
  numericColumns.forEach(column => {
    const values = dataset.data
      .map(row => row[column.name])
      .filter(v => typeof v === 'number' && !isNaN(v))
      .sort((a, b) => a - b);
    
    if (values.length === 0) return;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = values[Math.floor(values.length / 2)];
    const min = values[0];
    const max = values[values.length - 1];
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    
    // Calculate mode (most frequent value)
    const frequency: Record<number, number> = {};
    values.forEach(v => frequency[v] = (frequency[v] || 0) + 1);
    const mode = Object.entries(frequency).reduce((a, b) => frequency[Number(a[0])] > frequency[Number(b[0])] ? a : b)[0];
    
    // Calculate skewness and kurtosis
    const skewness = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / values.length;
    const kurtosis = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / values.length - 3;
    
    stats[column.name] = {
      mean,
      median,
      mode: Number(mode),
      min,
      max,
      stdDev,
      variance,
      range: max - min,
      q1,
      q3,
      iqr: q3 - q1,
      skewness,
      kurtosis,
    };
  });
  
  return stats;
}

function calculateCategoricalStats(dataset: Dataset, categoricalColumns: ColumnInfo[]): Record<string, CategoricalStats> {
  const stats: Record<string, CategoricalStats> = {};
  
  categoricalColumns.forEach(column => {
    const values = dataset.data
      .map(row => row[column.name])
      .filter(v => v !== null && v !== undefined && v !== '');
    
    if (values.length === 0) return;
    
    const frequency: Record<string, number> = {};
    values.forEach(v => {
      const key = String(v);
      frequency[key] = (frequency[key] || 0) + 1;
    });
    
    const sortedCategories = Object.entries(frequency)
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / values.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);
    
    stats[column.name] = {
      topCategories: sortedCategories,
      uniqueCount: Object.keys(frequency).length,
      mostFrequent: sortedCategories[0]?.value || '',
      leastFrequent: sortedCategories[sortedCategories.length - 1]?.value || '',
    };
  });
  
  return stats;
}

function calculateCorrelations(dataset: Dataset, numericColumns: ColumnInfo[]): Correlation[] {
  const correlations: Correlation[] = [];
  
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const col1 = numericColumns[i].name;
      const col2 = numericColumns[j].name;
      
      const values1 = dataset.data.map(row => row[col1]).filter(v => typeof v === 'number');
      const values2 = dataset.data.map(row => row[col2]).filter(v => typeof v === 'number');
      
      if (values1.length < 2 || values2.length < 2) continue;
      
      const coefficient = pearsonCorrelation(values1, values2);
      const absCoeff = Math.abs(coefficient);
      
      let strength: 'weak' | 'moderate' | 'strong';
      if (absCoeff < 0.3) strength = 'weak';
      else if (absCoeff < 0.7) strength = 'moderate';
      else strength = 'strong';
      
      correlations.push({
        column1: col1,
        column2: col2,
        coefficient,
        strength,
        direction: coefficient > 0 ? 'positive' : 'negative',
      });
    }
  }
  
  return correlations.filter(corr => Math.abs(corr.coefficient) > 0.1);
}

function generateInsights(
  dataset: Dataset,
  columns: ColumnInfo[],
  numericStats: Record<string, NumericStats>,
  categoricalStats: Record<string, CategoricalStats>,
  correlations: Correlation[]
): Insight[] {
  const insights: Insight[] = [];
  
  // Missing data insights
  columns.forEach(col => {
    if (col.nullPercentage > 20) {
      insights.push({
        type: 'quality',
        title: `High missing data in ${col.name}`,
        description: `Column "${col.name}" has ${col.nullPercentage.toFixed(1)}% missing values, which may affect analysis quality.`,
        severity: col.nullPercentage > 50 ? 'high' : 'medium',
        column: col.name,
      });
    }
  });
  
  // Correlation insights
  correlations.filter(corr => Math.abs(corr.coefficient) > 0.7).forEach(corr => {
    insights.push({
      type: 'correlation',
      title: `Strong ${corr.direction} correlation detected`,
      description: `${corr.column1} and ${corr.column2} show a ${corr.strength} ${corr.direction} correlation (r=${corr.coefficient.toFixed(3)}).`,
      severity: 'medium',
    });
  });
  
  // Outlier detection for numeric columns
  Object.entries(numericStats).forEach(([column, stats]) => {
    const outlierThreshold = 3 * stats.stdDev;
    if (stats.max > stats.mean + outlierThreshold || stats.min < stats.mean - outlierThreshold) {
      insights.push({
        type: 'anomaly',
        title: `Potential outliers in ${column}`,
        description: `Column "${column}" contains values that are more than 3 standard deviations from the mean, indicating possible outliers.`,
        severity: 'low',
        column,
      });
    }
  });
  
  // Skewness insights
  Object.entries(numericStats).forEach(([column, stats]) => {
    if (Math.abs(stats.skewness) > 1) {
      insights.push({
        type: 'distribution',
        title: `${column} shows ${stats.skewness > 0 ? 'right' : 'left'} skew`,
        description: `The distribution of "${column}" is ${Math.abs(stats.skewness) > 2 ? 'highly' : 'moderately'} skewed (skewness: ${stats.skewness.toFixed(2)}).`,
        severity: 'low',
        column,
      });
    }
  });
  
  // Low cardinality insights
  columns.forEach(col => {
    if (col.type === 'categorical' && col.uniqueValues < 5 && col.uniqueValues > 1) {
      insights.push({
        type: 'recommendation',
        title: `${col.name} suitable for grouping analysis`,
        description: `Column "${col.name}" has ${col.uniqueValues} unique values, making it ideal for group-by operations and categorical analysis.`,
        severity: 'low',
        column: col.name,
      });
    }
  });
  
  return insights.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

function calculateQualityScore(columns: ColumnInfo[]): number {
  const scores = columns.map(col => 100 - col.nullPercentage);
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function generateRecommendations(
  dataset: Dataset,
  columns: ColumnInfo[],
  insights: Insight[]
): string[] {
  const recommendations: string[] = [];
  
  const highMissingDataCols = columns.filter(col => col.nullPercentage > 20);
  if (highMissingDataCols.length > 0) {
    recommendations.push(`Consider imputation or removal of columns with high missing data: ${highMissingDataCols.map(c => c.name).join(', ')}`);
  }
  
  const lowCardinalityCols = columns.filter(col => col.uniqueValues < 0.1 * dataset.rowCount && col.uniqueValues > 1);
  if (lowCardinalityCols.length > 0) {
    recommendations.push(`Explore categorical analysis for low-cardinality columns: ${lowCardinalityCols.slice(0, 3).map(c => c.name).join(', ')}`);
  }
  
  const numericCols = columns.filter(col => col.type === 'numeric');
  if (numericCols.length > 1) {
    recommendations.push('Consider correlation analysis and feature selection for numeric columns');
  }
  
  const duplicateRows = findDuplicateRows(dataset);
  if (duplicateRows > 0) {
    recommendations.push(`Remove ${duplicateRows} duplicate rows to improve data quality`);
  }
  
  if (dataset.rowCount > 10000) {
    recommendations.push('Consider data sampling or aggregation techniques for large datasets to improve processing speed');
  }
  
  const anomalyInsights = insights.filter(i => i.type === 'anomaly');
  if (anomalyInsights.length > 0) {
    recommendations.push('Investigate and potentially handle outliers in numeric columns');
  }
  
  return recommendations.slice(0, 6);
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isDateString(value: any): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.length > 8;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const meanX = x.slice(0, n).reduce((sum, v) => sum + v, 0) / n;
  const meanY = y.slice(0, n).reduce((sum, v) => sum + v, 0) / n;
  
  let numerator = 0;
  let sumSquaredX = 0;
  let sumSquaredY = 0;
  
  for (let i = 0; i < n; i++) {
    const deltaX = x[i] - meanX;
    const deltaY = y[i] - meanY;
    
    numerator += deltaX * deltaY;
    sumSquaredX += deltaX * deltaX;
    sumSquaredY += deltaY * deltaY;
  }
  
  const denominator = Math.sqrt(sumSquaredX * sumSquaredY);
  return denominator === 0 ? 0 : numerator / denominator;
}

function findDuplicateRows(dataset: Dataset): number {
  const seen = new Set();
  let duplicates = 0;
  
  dataset.data.forEach(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  });
  
  return duplicates;
}