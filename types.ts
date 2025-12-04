export interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

export interface ParsedSheet {
  name: string;
  data: ExcelRow[];
  columns: string[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface CalculatorConfig {
  stockPercentage: number;
  retentionsPct: number; // 0 to 100
  includeTaxes: boolean;
  shippingSurchargeAmount: number;
  shippingSurchargeType: 'fixed' | 'percent';
}

export interface ProcessedRow {
  'SKU': string;
  'Publicación': string; // Item ID
  'Descripción': string;
  'Stock Real': number;
  'Stock Publicado': number;
  'Stock Anterior ML': number; // Added for comparison
  'Moneda': string;
  'Costo Base (Odoo)': number;
  'Tarifa Objetivo': number;
  'Precio Publicación': number;
  'Precio Anterior ML': number;
  'Cargo por Vender': number;
  'Costo Financiación': number;
  'Retenciones': number;
  'IVA Estimado': number;
  'Recibís (Neto)': number;
  'Tipo Publicación': string;
  'Envío': string;
  'Notas': string;
  [key: string]: string | number | boolean | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}