import React, { useState, useEffect } from 'react';
import { parseExcelFile, processFiles, downloadExcel } from './services/excelService';
import { ParsedSheet, AnalysisStatus, CalculatorConfig, ProcessedRow } from './types';
import FileUpload from './components/FileUpload';
import DataGrid from './components/DataGrid';
import StatsDashboard from './components/StatsDashboard';

// Tooltip Component
const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative flex items-center ml-1">
    <div className="cursor-help text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-50 text-center pointer-events-none">
      {text}
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-800"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Files State
  const [mlSheet, setMlSheet] = useState<ParsedSheet | null>(null);
  const [odooSheet, setOdooSheet] = useState<ParsedSheet | null>(null);
  const [mlFileName, setMlFileName] = useState<string | null>(null);
  const [odooFileName, setOdooFileName] = useState<string | null>(null);

  // Configuration State
  const [config, setConfig] = useState<CalculatorConfig>({
    stockPercentage: 100,
    retentionsPct: 1, // Default 1%
    includeTaxes: true,
    shippingSurchargeAmount: 0,
    shippingSurchargeType: 'fixed',
  });

  // Results State
  const [results, setResults] = useState<ProcessedRow[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Apply Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Derived state
  const resultSheet: ParsedSheet | null = results.length > 0 ? {
    name: 'Resultados Calculados',
    data: results,
    columns: Object.keys(results[0])
  } : null;

  const handleMlUpload = async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      const validSheet = parsed.find(s => s.columns.includes('ITEM_ID') || s.columns.includes('SKU'));
      if (validSheet) {
        setMlSheet(validSheet);
        setMlFileName(file.name);
      } else {
        throw new Error("El archivo no parece ser de Mercado Libre (Faltan columnas ITEM_ID o SKU)");
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const handleOdooUpload = async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      const validSheet = parsed.find(s => s.columns.includes('Código Neored') || s.columns.includes('Referencia interna'));
      if (validSheet) {
        setOdooSheet(validSheet);
        setOdooFileName(file.name);
      } else {
        throw new Error("El archivo no parece ser de Odoo (Falta columna Código Neored)");
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const handleCalculate = () => {
    if (!mlSheet || !odooSheet) {
      setErrorMessage("Por favor carga ambos archivos antes de calcular.");
      return;
    }
    
    setStatus(AnalysisStatus.PARSING);
    setTimeout(() => {
        try {
            const calculatedData = processFiles(mlSheet, odooSheet, config);
            setResults(calculatedData);
            setStatus(AnalysisStatus.READY);
            setErrorMessage(null);
        } catch (e: any) {
            setErrorMessage("Error en el cálculo: " + e.message);
            setStatus(AnalysisStatus.ERROR);
        }
    }, 100);
  };

  const handleDownload = () => {
    if (results.length > 0) {
      downloadExcel(results, `Resultados_ML_Odoo_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
  };

  const handleReset = () => {
    setMlSheet(null);
    setOdooSheet(null);
    setMlFileName(null);
    setOdooFileName(null);
    setResults([]);
    setStatus(AnalysisStatus.IDLE);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-200">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-400 p-1.5 rounded-lg shadow-sm">
                 <div className="text-slate-900 font-bold text-xs leading-none">ML</div>
                 <div className="text-slate-900 font-bold text-xs leading-none">+O</div>
              </div>
              <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Calculadora ML</span>
            </div>
            
            <div className="flex items-center gap-4">
                 {/* Theme Toggle */}
                 <button 
                   onClick={() => setDarkMode(!darkMode)}
                   className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full transition-colors"
                   title={darkMode ? "Usar modo claro" : "Usar modo oscuro"}
                 >
                    {darkMode ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    )}
                 </button>

                 {status === AnalysisStatus.READY && (
                    <button 
                        onClick={handleDownload}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Descargar Excel
                    </button>
                 )}
                 <button 
                    onClick={handleReset}
                    className="text-sm font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                 >
                    Reiniciar
                 </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6">
        
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-r shadow-sm flex justify-between items-center">
            <div>
                <p className="font-bold">Atención</p>
                <p>{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 dark:hover:text-red-300">&times;</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-8rem)]">
            
            {/* Left Panel: Configuration & Uploads */}
            <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4">
                
                {/* File Uploads */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">1. Carga de Archivos</h3>
                    <div className="flex flex-col gap-3">
                        <FileUpload 
                            label="Archivo Mercado Libre" 
                            onFileSelect={handleMlUpload} 
                            fileName={mlFileName}
                        />
                        <FileUpload 
                            label="Archivo Odoo" 
                            onFileSelect={handleOdooUpload} 
                            fileName={odooFileName}
                        />
                    </div>
                </div>

                {/* Configuration */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">2. Parámetros</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center mb-1">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Porcentaje de Stock (%)</label>
                                <Tooltip text="Define qué porcentaje del stock real disponible en Odoo se mostrará en la publicación de Mercado Libre." />
                            </div>
                            <input 
                                type="number" 
                                value={config.stockPercentage}
                                onChange={e => setConfig({...config, stockPercentage: parseFloat(e.target.value) || 0})}
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <div className="flex items-center mb-1">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Retenciones / IIBB (%)</label>
                                <Tooltip text="Porcentaje estimado de Ingresos Brutos y otras retenciones que se descontarán de la venta." />
                            </div>
                            <input 
                                type="number" 
                                value={config.retentionsPct}
                                onChange={e => setConfig({...config, retentionsPct: parseFloat(e.target.value) || 0})}
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-2 py-2">
                             <input 
                                type="checkbox" 
                                id="incTax"
                                checked={config.includeTaxes}
                                onChange={e => setConfig({...config, includeTaxes: e.target.checked})}
                                className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                             />
                             <div className="flex items-center">
                                <label htmlFor="incTax" className="text-sm text-slate-700 dark:text-slate-200">Incluir Impuestos (Odoo)</label>
                                <Tooltip text="Si está activo, suma el IVA configurado en el producto de Odoo al costo base antes de calcular el precio de venta." />
                             </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-1">
                            <div className="flex items-center mb-1">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Recargo Envío (Opcional)</label>
                                <Tooltip text="Monto extra a sumar al precio objetivo para cubrir costos de 'Envío Gratis' o logística propia." />
                            </div>
                            <div className="flex gap-2 mb-2">
                                <select 
                                    className="border border-slate-300 dark:border-slate-600 rounded text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white px-2 focus:outline-none"
                                    value={config.shippingSurchargeType}
                                    onChange={e => setConfig({...config, shippingSurchargeType: e.target.value as 'fixed' | 'percent'})}
                                >
                                    <option value="fixed">$ Fijo</option>
                                    <option value="percent">% Porc</option>
                                </select>
                                <input 
                                    type="number" 
                                    value={config.shippingSurchargeAmount}
                                    onChange={e => setConfig({...config, shippingSurchargeAmount: parseFloat(e.target.value) || 0})}
                                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Aplica solo a envíos Gratis o por Mi Cuenta.</p>
                        </div>
                    </div>

                    <button 
                        onClick={handleCalculate}
                        disabled={!mlSheet || !odooSheet}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow transition-colors"
                    >
                        CALCULAR PRECIOS
                    </button>
                </div>
            </div>

            {/* Middle Panel: Results Grid */}
            <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[500px] lg:h-auto">
                {status === AnalysisStatus.READY && resultSheet ? (
                     <DataGrid sheet={resultSheet} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                        <div className="bg-slate-100 dark:bg-slate-700 p-6 rounded-full mb-4 transition-colors">
                            <svg className="w-12 h-12 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <p>Sube los archivos y presiona Calcular para ver la tabla de resultados aquí.</p>
                    </div>
                )}
            </div>

            {/* Right Panel: Stats Dashboard */}
            <div className="w-full lg:w-[280px] flex-shrink-0 h-auto lg:h-full">
               {status === AnalysisStatus.READY ? (
                   <div className="h-full flex flex-col">
                      <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Resumen</h3>
                      <div className="flex-1 overflow-auto">
                        <StatsDashboard results={results} />
                      </div>
                   </div>
               ) : (
                   <div className="h-full bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-6 text-center">
                      <p className="text-sm text-slate-400 dark:text-slate-500">Los indicadores aparecerán aquí después del cálculo.</p>
                   </div>
               )}
            </div>

        </div>
      </main>
    </div>
  );
};

export default App;