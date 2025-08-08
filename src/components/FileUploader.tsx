import React, { useCallback, useState } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, []);
  
  const handleFile = (file: File) => {
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/json'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please upload an Excel (.xlsx, .xls) or JSON file.');
      return;
    }
    
    if (file.size > maxSize) {
      alert('File size must be less than 50MB.');
      return;
    }
    
    onFileUpload(file);
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".xlsx,.xls,.json"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full transition-colors ${
            dragActive ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Upload className={`h-8 w-8 transition-colors ${
              dragActive ? 'text-blue-600' : 'text-gray-600'
            }`} />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {dragActive ? 'Drop your file here' : 'Upload your dataset'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop your file here, or{' '}
              <label htmlFor="file-upload" className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                browse to upload
              </label>
            </p>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <File className="h-3 w-3" />
              <span>Excel, JSON</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3" />
              <span>Max 50MB</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-center text-xs text-gray-500">
        Your data is processed locally and never leaves your browser
      </div>
    </div>
  );
};

export default FileUploader;