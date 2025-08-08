import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, Calendar, Hash, Tag, Sparkles, CheckCircle } from 'lucide-react';
import type { Dataset } from '../types/analysis';

interface DataPreviewProps {
  dataset: Dataset;
}

const DataPreview: React.FC<DataPreviewProps> = ({ dataset }) => {
  const [expanded, setExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 10;
  
  const paginatedData = dataset.data.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );
  
  const totalPages = Math.ceil(dataset.data.length / rowsPerPage);
  
  const getColumnIcon = (value: any) => {
    if (typeof value === 'number') return <Hash className="h-3 w-3 text-blue-500" />;
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      return <Calendar className="h-3 w-3 text-green-500" />;
    }
    return <Tag className="h-3 w-3 text-purple-500" />;
  };
  
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400 italic">null</span>;
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
    return String(value);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div 
        className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <Database className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
            <p className="text-sm text-gray-600">
              {dataset.fileName} • {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {dataset.fileSize}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4">
          {dataset.cleaningReport && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-800">Data Automatically Cleaned</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-green-700">{dataset.cleaningReport.originalRows}</div>
                  <div className="text-green-600">Original Rows</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-700">{dataset.cleaningReport.cleanedRows}</div>
                  <div className="text-green-600">Clean Rows</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-700">{dataset.cleaningReport.handledMissingValues}</div>
                  <div className="text-green-600">Missing Filled</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-700">{dataset.cleaningReport.removedDuplicates}</div>
                  <div className="text-green-600">Duplicates Removed</div>
                </div>
              </div>
              {dataset.cleaningReport.cleaningActions.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-green-800 mb-2">Cleaning Actions Performed:</h5>
                  <div className="space-y-1">
                    {dataset.cleaningReport.cleaningActions.map((action, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-green-700">
                        <CheckCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {dataset.columns.map((column, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex items-center space-x-2">
                        {getColumnIcon(dataset.data[0]?.[column])}
                        <span>{column}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {dataset.columns.map((column, colIndex) => (
                      <td key={colIndex} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {currentPage * rowsPerPage + 1} to {Math.min((currentPage + 1) * rowsPerPage, dataset.rowCount)} of {dataset.rowCount} rows
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 text-sm bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="px-3 py-1 text-sm bg-white border rounded-md hover:bg-gray-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataPreview;