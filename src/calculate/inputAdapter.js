// src/calculate/inputAdapter.js
// Adaptador de entrada: unifica CSV/API JSON a OHLCV cronologico.

function pick(row, keys) {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return undefined;
}

function toNum(v) {
  if (v === undefined || v === null || v === '') return NaN;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const s = String(v).trim();
  if (!s) return NaN;

  // Soporta "1.234,56" y "1,234.56".
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return parseFloat(s.replace(/,/g, ''));
  }

  if (s.includes(',')) return parseFloat(s.replace(',', '.'));
  return parseFloat(s);
}

function parseDateComparable(dateLike) {
  if (!dateLike) return '';
  const d = String(dateLike).trim();
  if (!d) return '';

  // YYYY-MM-DD / YYYY/MM/DD
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(d)) return d.replace(/\//g, '-').slice(0, 10);

  // DD/MM/YYYY o DD.MM.YYYY
  const m = d.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }

  const dt = new Date(d);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return d;
}

function maybeReverseChronological(data) {
  if (!Array.isArray(data) || data.length < 2) return data;
  const first = parseDateComparable(data[0].date);
  const last = parseDateComparable(data[data.length - 1].date);
  if (first && last && first > last) data.reverse();
  return data;
}

function normalizeObjectRow(row) {
  return {
    date: pick(row, ['date', 'Date', 'Fecha', 'datetime', 'Datetime', 'Time', 'timestamp']) ?? '',
    open: toNum(pick(row, ['open', 'Open', 'Apertura', 'OPEN', 'o'])),
    high: toNum(pick(row, ['high', 'High', 'MAX', 'Máximo', 'HIGH', 'h'])),
    low: toNum(pick(row, ['low', 'Low', 'MIN', 'Mínimo', 'LOW', 'l'])),
    close: toNum(pick(row, ['close', 'Close', 'Cierre', 'Último', 'PRICE', 'price', 'c'])),
    volume: toNum(pick(row, ['volume', 'Volume', 'Volumen', 'Vol.', 'Vol', 'VOLUME', 'v']))
  };
}

function normalizeArrayRow(row) {
  // CoinGecko OHLC: [timestamp, open, high, low, close]
  return {
    date: row[0] != null ? new Date(Number(row[0])).toISOString().slice(0, 10) : '',
    open: toNum(row[1]),
    high: toNum(row[2]),
    low: toNum(row[3]),
    close: toNum(row[4]),
    volume: toNum(row[5])
  };
}

export function normalizeMarketData(input) {
  if (!input) return [];

  let rows = [];
  if (Array.isArray(input)) {
    rows = input;
  } else if (Array.isArray(input.values)) {
    // TwelveData time series completo
    rows = input.values;
  } else {
    return [];
  }

  const normalized = rows.map(row => (
    Array.isArray(row) ? normalizeArrayRow(row) : normalizeObjectRow(row)
  )).filter(r => !Number.isNaN(r.close) && !Number.isNaN(r.high) && !Number.isNaN(r.low));

  return maybeReverseChronological(normalized);
}
