import React from 'react';
import { ProcessedRow } from '../types';

interface StatsDashboardProps {
  results: ProcessedRow[];
}

const StatCard: React.FC<{ title: string; value: number | string; subtext: string; colorClass: string; icon: React.ReactNode }> = ({ title, value, subtext, colorClass, icon }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-start justify-between`}>
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <h4 className={`text-2xl font-bold ${colorClass}`}>{value}</h4>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtext}</p>
    </div>
    <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-').replace('600', '100').replace('500', '100')} dark:bg-opacity-20`}>
       {icon}
    </div>
  </div>
);

const StatsDashboard: React.FC<StatsDashboardProps> = ({ results }) => {
  if (!results || results.length === 0) return null;

  // KPIs
  const total = results.length;
  
  const notSynced = results.filter(r => r['Notas'].includes('SKU no encontrado')).length;
  const synced = total - notSynced;
  
  const zeroStock = results.filter(r => !r['Notas'].includes('SKU no encontrado') && (r['Stock Real'] === 0)).length;
  
  // Price Change: Diff > 1.0 currency unit to avoid float noise
  const priceChanged = results.filter(r => Math.abs((r['Precio Publicación'] as number) - (r['Precio Anterior ML'] as number)) > 1).length;
  
  // Stock Change: New Published Stock != Old ML Quantity
  const stockChanged = results.filter(r => (r['Stock Publicado'] as number) !== (r['Stock Anterior ML'] as number)).length;

  const warnings = results.filter(r => r['Notas'] !== 'OK').length;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-y-auto scrollbar-hide">
      <div className="grid grid-cols-1 gap-4">
        
        {/* 1. Total Procesados */}
        <StatCard 
            title="Total Procesados" 
            value={total} 
            subtext="Publicaciones analizadas"
            colorClass="text-blue-600"
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />

        {/* 2. Sincronizados */}
        <StatCard 
            title="Sincronizados" 
            value={synced} 
            subtext="Encontrados en Odoo"
            colorClass="text-green-600"
            icon={<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        />

        {/* 3. No Encontrados */}
        <StatCard 
            title="No Encontrados" 
            value={notSynced} 
            subtext="SKU sin coincidencia"
            colorClass="text-red-500"
            icon={<svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />

        {/* 4. Variación de Precio */}
        <StatCard 
            title="Cambio de Precio" 
            value={priceChanged} 
            subtext="Precio Final vs Actual"
            colorClass="text-purple-600"
            icon={<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />

        {/* 5. Variación de Stock */}
        <StatCard 
            title="Cambio de Stock" 
            value={stockChanged} 
            subtext="Stock Odoo vs ML"
            colorClass="text-orange-500"
            icon={<svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />

        {/* 6. Con Alertas */}
        <StatCard 
            title="Con Alertas" 
            value={warnings} 
            subtext="Notas o Sin Stock"
            colorClass="text-yellow-600"
            icon={<svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />

      </div>
    </div>
  );
};

export default StatsDashboard;