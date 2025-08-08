import React, { useState, useCallback } from 'react';
import { Upload, FileText, BarChart3, Download, Zap, Sparkles } from 'lucide-react';
import FileUploader from './components/FileUploader';
import DataPreview from './components/DataPreview';
import AnalysisReport from './components/AnalysisReport';
import { parseDataset, analyzeData } from './utils/dataAnalysis';
import type { Dataset, AnalysisResult } from './types/analysis';

function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const parsedData = await parseDataset(file);
      setDataset(parsedData);
      
      // Automatically analyze the data
      const analysisResult = analyzeData(parsedData);
      setAnalysis(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetAnalysis = () => {
    setDataset(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DataInsight Pro</h1>
                <p className="text-sm text-gray-600">Automated Data Analysis Platform</p>
              </div>
            </div>
            {analysis && (
              <button
                onClick={resetAnalysis}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>New Analysis</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 text-red-400">⚠</div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">Analyzing your data...</p>
                <p className="text-sm text-gray-600">This may take a moment</p>
              </div>
            </div>
          </div>
        )}

        {!dataset && !loading && (
          <div className="text-center py-12">
            <div className="max-w-2xl mx-auto">
              <div className="mb-8">
                <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Zap className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Transform Your Data Into Insights
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Upload your dataset and get comprehensive analysis reports in seconds with automatic data cleaning. 
                  Supports Excel and JSON formats with intelligent preprocessing, statistical analysis, 
                  visualizations, and actionable insights.
                </p>
              </div>
              
              <FileUploader onFileUpload={handleFileUpload} />
              
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Auto Cleaning</h3>
                  <p className="text-sm text-gray-600">Automatically handles missing values, duplicates, and outliers</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Auto Analysis</h3>
                  <p className="text-sm text-gray-600">Get statistical insights and visualizations automatically</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Detailed Reports</h3>
                  <p className="text-sm text-gray-600">Professional reports ready for presentation</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {dataset && !loading && (
          <div className="space-y-8">
            <DataPreview dataset={dataset} />
            {analysis && <AnalysisReport analysis={analysis} dataset={dataset} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;