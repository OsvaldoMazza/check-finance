// src/components/dataUtils/index.js
// Pure data transformation helpers

export function filterDataByPeriod(data, period) {
  if (!data || data.length === 0) return data;

  if (period === 'all') return data;

  const days = parseInt(period);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limitDate = new Date(today);
  limitDate.setDate(limitDate.getDate() - days);

  const result = data.filter(item => {
    if (!item.date) return true;
    const itemDate = new Date(item.date);
    return itemDate >= limitDate;
  });

  console.log(`📊 Filtrado por fecha: ${result.length} puntos de ${data.length} totales (últimos ${days} días desde ${limitDate.toISOString().slice(0,10)})`);
  return result;
}

export function normalizeData(raw) {
  return raw.map(row => {
    const parseNum = (val) => {
      if (!val) return NaN;
      const cleaned = String(val).replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned);
    };

    const parseDate = (val) => {
      if (!val) return '';
      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return val;
        return date.toISOString().slice(0, 10);
      } catch {
        return val;
      }
    };

    return {
      date: parseDate(row.Fecha || row.Date || row.date || ''),
      open:   parseNum(row.Apertura   ?? row.open   ?? row.Open),
      high:   parseNum(row['Máximo']  ?? row.high   ?? row.High),
      low:    parseNum(row['Mínimo']  ?? row.low    ?? row.Low),
      close:  parseNum(row['Último']  ?? row.close  ?? row.Close),
      volume: parseNum(row['Vol.']    ?? row.volume ?? row.Volume)
    };
  }).filter(r => !isNaN(r.close) && !isNaN(r.high) && !isNaN(r.low));
}
