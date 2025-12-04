import * as XLSX from 'xlsx';
import { ParsedSheet, ExcelRow, CalculatorConfig, ProcessedRow } from '../types';

// Helper to clean strings and extract numbers
const extractPercentage = (str: any): number => {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;
  const match = str.match(/(\d+(?:[.,]\d+)?)%/);
  if (match) return parseFloat(match[1].replace(',', '.')) / 100;
  return 0;
};

const extractMoney = (str: any): number => {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;
  // Looks for numbers, handling thousands separator and decimals
  // This is a basic implementation, can be tuned based on locale
  const match = str.match(/[\d.,]+/); 
  if (match) {
    // simplistic approach: remove non-numeric chars except dot
    return parseFloat(str.replace(/[^\d.-]/g, ''));
  }
  return 0;
};

const parseMLFee = (str: any) => {
  // Format example: "14% + $ 150.00" or just "14%" or just "$ 150"
  let pct = 0;
  let fixed = 0;
  
  if (!str) return { pct, fixed };
  const stringVal = String(str);

  // Extract %
  const pctMatch = stringVal.match(/(\d+(?:[.,]\d+)?)%/);
  if (pctMatch) {
    pct = parseFloat(pctMatch[1].replace(',', '.')) / 100;
  }

  // Extract Fixed (look for $ or plain number after +)
  // Simple heuristic: split by '+' look for money symbol or raw number
  const parts = stringVal.split('+');
  parts.forEach(p => {
    if (!p.includes('%')) {
       // Assume money part
       const val = parseFloat(p.replace(/[^\d.]/g, ''));
       if (!isNaN(val)) fixed = val;
    }
  });

  return { pct, fixed };
};

export const parseExcelFile = async (file: File): Promise<ParsedSheet[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("No se pudieron leer los datos del archivo."));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheets: ParsedSheet[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: "" });

          if (jsonData.length > 0) {
            const columns = Object.keys(jsonData[0]);
            sheets.push({
              name: sheetName,
              data: jsonData,
              columns: columns
            });
          }
        });

        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const processFiles = (
  mlSheet: ParsedSheet,
  odooSheet: ParsedSheet,
  config: CalculatorConfig
): ProcessedRow[] => {
  
  // Index Odoo Data for fast lookup by SKU (Código Neored)
  const odooMap = new Map<string, ExcelRow>();
  odooSheet.data.forEach(row => {
    const sku = String(row['Código Neored'] || row['Referencia interna'] || '').trim();
    if (sku) odooMap.set(sku, row);
  });

  const results: ProcessedRow[] = [];

  mlSheet.data.forEach(mlRow => {
    // 1. Clean & Filter ML
    const itemId = String(mlRow['ITEM_ID'] || '');
    const sku = String(mlRow['SKU'] || mlRow['seller_sku'] || '').trim();

    if (!itemId.startsWith('ML') || !sku) return; // Skip invalid rows

    const title = String(mlRow['TITLE'] || '');
    const mlPrice = parseFloat(String(mlRow['PRICE'] || '0'));
    const mlQuantity = parseFloat(String(mlRow['QUANTITY'] || mlRow['available_quantity'] || '0'));
    const feeStr = mlRow['FEE_PER_SALE_MARKETPLACE_V2'];
    const financingStr = mlRow['COST_OF_FINANCING_MARKETPLACE'];
    const listingType = String(mlRow['LISTING_TYPE_V3'] || '');
    const shippingMethod = String(mlRow['SHIPPING_METHOD'] || '').toLowerCase();
    
    // Parse Fees
    const { pct: feePct, fixed: feeFixed } = parseMLFee(feeStr);
    const financingPct = extractPercentage(financingStr);
    const retentionPct = config.retentionsPct / 100;

    // 2. Find Match in Odoo
    const odooRow = odooMap.get(sku);
    let notes: string[] = [];
    
    let basePrice = 0;
    let odooStock = 0;
    let taxesPct = 0;
    let odooName = '';

    if (!odooRow) {
      notes.push("SKU no encontrado en Odoo");
    } else {
      odooName = String(odooRow['Nombre'] || odooRow['Name'] || '');
      basePrice = parseFloat(String(odooRow['Precio Tarifa'] || odooRow['Price'] || '0'));
      odooStock = parseFloat(String(odooRow['Cantidad a mano'] || odooRow['Quantity'] || '0'));
      
      // Parse Odoo Tax
      // Assuming format "IVA 21%" or just number
      const taxStr = String(odooRow['Impuestos del cliente'] || '');
      const matchTax = taxStr.match(/(\d+(?:[.,]\d+)?)%/);
      if (matchTax) {
         taxesPct = parseFloat(matchTax[1].replace(',', '.')) / 100;
      } else if (!isNaN(parseFloat(taxStr)) && parseFloat(taxStr) < 1) {
         taxesPct = parseFloat(taxStr); // Assume 0.21
      }
      
      if (basePrice <= 0) notes.push("Tarifa 0 o faltante");
      if (odooStock <= 0) notes.push("Sin stock en Odoo");
    }

    // 3. Logic Calculation
    
    // Base Net Tariff
    let tariffBase = basePrice;
    if (config.includeTaxes) {
      tariffBase = basePrice * (1 + taxesPct);
    }
    
    // Shipping Surcharge
    let shippingSurcharge = 0;
    const appliesShipping = shippingMethod.includes('gratis') || shippingMethod.includes('mi cuenta') || shippingMethod.includes('self_service');
    
    if (appliesShipping) {
      if (config.shippingSurchargeType === 'fixed') {
        shippingSurcharge = config.shippingSurchargeAmount;
      } else {
        // Percentage
        shippingSurcharge = tariffBase * (config.shippingSurchargeAmount / 100);
      }
    }

    const targetTariff = tariffBase + shippingSurcharge;

    // Calculate Final Publication Price
    // Formula: price = (Target + FixedFee) / (1 - (Fees + Fin + Ret))
    const totalDeductionsPct = feePct + financingPct + retentionPct;
    const denominator = 1 - totalDeductionsPct;
    
    let finalPrice = 0;
    let sellingFee = 0;
    let financingCost = 0;
    let retentionCost = 0;
    let netReceipt = 0;
    let estimatedIva = 0;
    let mlFeeAmount = 0; // The % part in currency
    let mlFeeFixed = feeFixed; 
    let publishedStock = Math.floor(odooStock * (config.stockPercentage / 100));

    if (denominator <= 0) {
      notes.push("ERROR: Porcentajes ML superan 100%");
    } else {
      finalPrice = (targetTariff + feeFixed) / denominator;
      
      // Breakdowns
      mlFeeAmount = finalPrice * feePct; // Just the % part
      sellingFee = mlFeeAmount + feeFixed; // Total selling fee
      financingCost = finalPrice * financingPct;
      retentionCost = finalPrice * retentionPct;
      netReceipt = finalPrice - (sellingFee + financingCost + retentionCost);

      // IVA calculation (informative)
      if (taxesPct > 0) {
         estimatedIva = (finalPrice * taxesPct) / (1 + taxesPct);
      }
    }

    // Rounding (2 decimals)
    const r2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

    // Construct the row for internal use (DataGrid)
    results.push({
      'SKU': sku,
      'Publicación': itemId,
      'Descripción': odooName || title,
      'Stock Real': odooStock,
      'Stock Publicado': publishedStock,
      'Stock Anterior ML': mlQuantity,
      'Moneda': String(mlRow['CURRENCY_ID'] || 'ARS'),
      'Costo Base (Odoo)': r2(basePrice),
      'Tarifa Objetivo': r2(targetTariff),
      'Precio Publicación': r2(finalPrice),
      'Precio Anterior ML': r2(mlPrice),
      'Recargo % ML': r2(mlFeeAmount),
      'Recargo Fijo ML': r2(mlFeeFixed),
      'Cargo por Vender': r2(sellingFee),
      'Costo Financiación': r2(financingCost),
      'Retenciones': r2(retentionCost),
      'IVA Estimado': r2(estimatedIva),
      'Recibís (Neto)': r2(netReceipt),
      'Recargo Envío': r2(shippingSurcharge),
      '% ML Aplicado': r2(feePct * 100) + '%',
      '% Financiación': r2(financingPct * 100) + '%',
      'Tipo Publicación': listingType,
      'Envío': shippingMethod,
      'Notas': notes.join(' | ') || 'OK'
    });
  });

  return results;
};

export const downloadExcel = (data: ProcessedRow[], filename: string) => {
  // 1. Map data to the exact keys requested
  const exportData = data.map(row => ({
    "Numero de publicación": row['Publicación'],
    "SKU": row['SKU'],
    "Descripción del producto": row['Descripción'],
    "Stock": row['Stock Real'],
    "% Stock": row['Stock Publicado'],
    "Precio de Tarifa": row['Costo Base (Odoo)'],
    "Precio final": row['Precio Publicación'],
    "IVA": row['IVA Estimado'],
    "Recargo % ML (importe)": row['Recargo % ML'],
    "Recargo fijo ML ($)": row['Recargo Fijo ML'],
    "Cargo por vender ($)": row['Cargo por Vender'],
    "Recargo financiación (importe)": row['Costo Financiación'],
    "Retenciones ML ($)": row['Retenciones'],
    "Recibis ($)": row['Recibís (Neto)'],
    "Recargo envío ($)": row['Recargo Envío'],
    "% ML aplicado": row['% ML Aplicado'],
    "% financiación aplicado": row['% Financiación'],
    "Tipo de publicación": row['Tipo Publicación'],
    "Precio actual en ML": row['Precio Anterior ML'],
    "Moneda": row['Moneda'],
    "Notas-Flags": row['Notas']
  }));

  // Create Sheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // 2. Calculate Column Widths (Max 50 chars)
  // Get all keys (headers)
  const keys = Object.keys(exportData[0] || {});
  
  // Initialize widths with header lengths
  const colWidths = keys.map(key => key.length);

  // Iterate over data to find max length per column
  exportData.forEach(row => {
    keys.forEach((key, idx) => {
      const cellValue = String((row as any)[key] || '');
      if (cellValue.length > colWidths[idx]) {
        colWidths[idx] = cellValue.length;
      }
    });
  });

  // Apply widths (capped at 50)
  ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w + 2, 50) }));

  // 3. Styling Logic
  // Define styles for Header and Data
  const headerStyle = {
    fill: { fgColor: { rgb: "366092" } }, // Dark Blue #366092
    font: { color: { rgb: "FFFFFF" }, bold: true, name: "Calibri", sz: 11 },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const numberStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { horizontal: "right" }
  };
  
  const defaultStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { horizontal: "left" }
  };

  // Apply Styles to Header Row (Row 0 in 0-indexed terms, range.s.r)
  const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
  
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: range.s.r, c: C }); // Row 0 (Headers)
    if (!ws[address]) continue;
    ws[address].s = headerStyle;
  }

  // Apply Styles to Data Rows
  const numericColIndices = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18];

  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[address]) continue;

      if (numericColIndices.includes(C)) {
        ws[address].s = numberStyle;
      } else {
        ws[address].s = defaultStyle;
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resultados");
  
  XLSX.writeFile(wb, filename);
};