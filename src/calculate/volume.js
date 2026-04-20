// src/calculate/volume.js
// Confirmación de volumen durante pullback

export function volumeConfirm(data, i, lookback = 20, pbWindow = 5) {
  const bar = data[i];
  if (!bar || bar.volume === undefined || isNaN(bar.volume)) return null;

  // Ventana de referencia: [i-lookback-pbWindow+1, i-pbWindow] (lookback barras)
  let sumAvg = 0, countAvg = 0;
  const avgStart = Math.max(0, i - lookback - pbWindow + 1);
  const avgEnd = Math.max(0, i - pbWindow);

  for (let j = avgStart; j <= avgEnd; j++) {
    if (!isNaN(data[j]?.volume)) {
      sumAvg += data[j].volume;
      countAvg++;
    }
  }
  
  if (countAvg === 0) return null;
  const avgVol = sumAvg / countAvg;

  // Ventana de pullback: [i-pbWindow+1, i]
  let sumPb = 0, countPb = 0;
  const pbStart = Math.max(0, i - pbWindow + 1);
  for (let j = pbStart; j <= i; j++) {
    if (!isNaN(data[j]?.volume)) {
      sumPb += data[j].volume;
      countPb++;
    }
  }
  
  if (countPb === 0) return null;
  const pbVol = sumPb / countPb;
  
  return pbVol < avgVol * 0.8;
}
