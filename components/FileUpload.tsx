import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  label: string;
  fileName?: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading, label, fileName }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    onFileSelect(file);
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-all duration-300 ease-in-out cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
            : fileName 
                ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-500' 
                : 'border-slate-300 bg-white hover:border-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:hover:border-slate-500'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept=".xlsx, .xls, .csv"
        />

        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-slate-600 dark:text-slate-300">Procesando...</p>
          </div>
        ) : (
          <>
            {fileName ? (
               <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-sm truncate max-w-[200px]">{fileName}</span>
               </div>
            ) : (
              <div className="text-center">
                <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-400">Clic o Arrastrar</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;