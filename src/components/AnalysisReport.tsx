import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Download, Eye, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import type { AnalysisResult, Dataset } from '../types/analysis';

interface AnalysisReportProps {
  analysis: AnalysisResult;
  dataset: Dataset;
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const AnalysisReport: React.FC<AnalysisReportProps> = ({ analysis, dataset }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const tabs = [
    { id: 'overview', name: 'Overview', icon: Eye },
    { id: 'statistics', name: 'Statistics', icon: BarChart3 },
    { id: 'visualizations', name: 'Charts', icon: PieChart },
    { id: 'insights', name: 'Insights', icon: TrendingUp },
    { id: 'quality', name: 'Data Quality', icon: AlertTriangle },
  ];
  
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'border-red-200 bg-red-50 text-red-800';
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default: return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };
  
  const generateNumericChartData = () => {
    const numericColumns = Object.keys(analysis.numericStats || {}).slice(0, 5);
    return numericColumns.map(col => ({
      name: col,
      mean: analysis.numericStats[col].mean,
      min: analysis.numericStats[col].min,
      max: analysis.numericStats[col].max,
    }));
  };
  
  const generateCategoricalChartData = (column: string) => {
    if (!analysis.categoricalStats || !analysis.categoricalStats[column]) return [];
    
    return analysis.categoricalStats[column].topCategories.slice(0, 6).map((cat, index) => ({
      name: cat.value.length > 15 ? `${cat.value.substring(0, 12)}...` : cat.value,
      value: cat.count,
      percentage: cat.percentage,
      fill: COLORS[index % COLORS.length]
    }));
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting report...');
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="border-b">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <span>Analysis Report</span>
          </h2>
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
        
        <div className="flex space-x-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Total Records</h3>
                <p className="text-2xl font-bold text-blue-600">{analysis.summary.totalRows.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Columns</h3>
                <p className="text-2xl font-bold text-green-600">{analysis.summary.totalColumns}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Numeric Features</h3>
                <p className="text-2xl font-bold text-purple-600">{analysis.summary.numericColumns}</p>
              </div>
              <div className={`p-4 rounded-lg ${getQualityColor(analysis.qualityScore)}`}>
                <h3 className="text-sm font-medium">Data Quality</h3>
                <p className="text-2xl font-bold">{analysis.qualityScore}%</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Dataset Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">File name:</span>
                    <span className="font-medium">{dataset.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Upload date:</span>
                    <span className="font-medium">{new Date(dataset.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Missing values:</span>
                    <span className="font-medium">{analysis.summary.missingValuePercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duplicate rows:</span>
                    <span className="font-medium">{analysis.summary.duplicateRows}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Top Recommendations</h3>
                <div className="space-y-2">
                  {analysis.recommendations.slice(0, 4).map((rec, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            {analysis.numericStats && Object.keys(analysis.numericStats).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Numeric Column Statistics</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mean</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Median</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Std Dev</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(analysis.numericStats).map(([column, stats]) => (
                        <tr key={column}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{column}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stats.mean?.toFixed(2) ?? 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stats.median?.toFixed(2) ?? 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stats.stdDev?.toFixed(2) ?? 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stats.min?.toFixed(2) ?? 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stats.max?.toFixed(2) ?? 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {analysis.categoricalStats && Object.keys(analysis.categoricalStats).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Categorical Column Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(analysis.categoricalStats).slice(0, 4).map(([column, stats]) => (
                    <div key={column} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">{column}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Unique values: {stats.uniqueCount}</div>
                        <div>Most frequent: {stats.mostFrequent}</div>
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Top categories:</div>
                          {stats.topCategories.slice(0, 3).map((cat, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span>{cat.value}</span>
                              <span>{cat.percentage.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'visualizations' && (
          <div className="space-y-8">
            {analysis.numericStats && Object.keys(analysis.numericStats).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Numeric Data Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={generateNumericChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="mean" fill="#2563EB" name="Mean" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {analysis.categoricalStats && Object.keys(analysis.categoricalStats).length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.keys(analysis.categoricalStats).slice(0, 4).map((column) => {
                  const chartData = generateCategoricalChartData(column);
                  return chartData.length > 0 ? (
                    <div key={column}>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">{column} Distribution</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name, props) => [
                              `${value} (${props.payload.percentage}%)`,
                              name
                            ]} />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
              <div className="grid grid-cols-1 gap-4">
                {analysis.insights?.map((insight, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {insight.type === 'correlation' && <TrendingUp className="h-5 w-5" />}
                        {insight.type === 'anomaly' && <AlertTriangle className="h-5 w-5" />}
                        {insight.type === 'quality' && <AlertTriangle className="h-5 w-5" />}
                        {(insight.type === 'distribution' || insight.type === 'recommendation') && <BarChart3 className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{insight.title}</h4>
                        <p className="text-sm">{insight.description}</p>
                        {insight.column && (
                          <p className="text-xs mt-1 opacity-75">Related to: {insight.column}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <span className="px-2 py-1 text-xs font-medium rounded-full capitalize">
                          {insight.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {analysis.correlations?.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Strong Correlations</h3>
                <div className="space-y-2">
                  {analysis.correlations
                    .filter(corr => Math.abs(corr.coefficient) > 0.5)
                    .map((corr, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{corr.column1}</span> ↔ <span className="font-medium">{corr.column2}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${corr.coefficient > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {corr.coefficient.toFixed(3)}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">
                            {Math.abs(corr.coefficient) > 0.7 ? 'strong' : 
                             Math.abs(corr.coefficient) > 0.5 ? 'moderate' : 'weak'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'quality' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Overall Quality Score</h3>
                <p className="text-3xl font-bold text-blue-600">{analysis.qualityScore}%</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">Missing Data</h3>
                <p className="text-3xl font-bold text-yellow-600">{analysis.summary.missingValuePercentage.toFixed(1)}%</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-800">Duplicate Rows</h3>
                <p className="text-3xl font-bold text-red-600">{analysis.summary.duplicateRows}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Column Quality Assessment</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique Values</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analysis.columns?.map((column) => {
                      const qualityScore = 100 - (column.nullPercentage || 0);
                      return (
                        <tr key={column.name}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{column.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 capitalize">{column.type}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{column.nullPercentage?.toFixed(1) ?? 0}%</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{column.uniqueValues?.toLocaleString() ?? 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`px-2 py-1 text-xs font-medium rounded-full ${getQualityColor(qualityScore)}`}>
                                {qualityScore.toFixed(0)}%
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-2">
                {analysis.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                    <span className="text-sm text-gray-700">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisReport;
