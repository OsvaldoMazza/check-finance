// src/calculate/score.js
// Cálculo de score y construcción de señales

import chikouClear, { pullbackType } from './signals.js';
import { detectRegime } from './regime.js';
import { detectReversal } from './reversal.js';
import { volumeConfirm } from './volume.js';

export function calculateScore(cond, pbType, reversal, volCheck, cloudThickness, cloudThicknessMin) {
  let coreScore = 0;
  const coreDetail = [];
  const minPct = cloudThicknessMin != null ? (cloudThicknessMin * 100).toFixed(2) : '0.30';

  // Tendencia (25 pts)
  coreScore += cond.trend ? 25 : 0;
  coreDetail.push({
    name: cond.trend
      ? 'Tendencia - Tenkan > Kijun y precio > Kijun'
      : 'Tendencia - Tenkan > Kijun y precio > Kijun',
    ok: cond.trend,
    pts: cond.trend ? 25 : 0,
    max: 25
  });

  // Nube (25 pts)
  const cloudPct = cloudThickness != null ? (cloudThickness * 100).toFixed(2) + '%' : '-';
  coreScore += cond.cloud ? 25 : 0;
  coreDetail.push({
    name: cond.cloud
      ? `Nube - bullish, expansion, espesor ${cloudPct} (min ${minPct}%)`
      : `Nube - falla filtro de soporte/expansion (espesor ${cloudPct})`,
    ok: cond.cloud,
    pts: cond.cloud ? 25 : 0,
    max: 25
  });

  // Rebote (25 pts)
  coreScore += cond.bounce ? 25 : 0;
  coreDetail.push({
    name: 'Rebote - close > Kijun fast',
    ok: cond.bounce,
    pts: cond.bounce ? 25 : 0,
    max: 25
  });

  // Chikou (25 pts)
  coreScore += cond.chikou ? 25 : 0;
  coreDetail.push({
    name: 'Chikou - close actual sobre high de referencia',
    ok: cond.chikou,
    pts: cond.chikou ? 25 : 0,
    max: 25
  });

  // Bonus
  let bonusScore = 0;
  const bonusDetail = [];

  // Reversal (+10 pts)
  const revOk = reversal.ok;
  bonusScore += revOk ? 10 : 0;
  bonusDetail.push({
    name: `Patron reversal (${reversal.pattern})`,
    pattern: reversal.pattern,
    ok: revOk,
    pts: revOk ? 10 : 0,
    max: 10,
    bonus: true
  });

  // Volumen (+10 pts)
  if (volCheck === null) {
    bonusDetail.push({
      name: 'Volumen confirmacion (sin datos en CSV)',
      ok: null,
      pts: 0,
      max: 10,
      nodata: true,
      bonus: true
    });
  } else if (volCheck) {
    bonusScore += 10;
    bonusDetail.push({
      name: 'Volumen < 80% media (confirmacion)',
      ok: true,
      pts: 10,
      max: 10,
      bonus: true
    });
  } else {
    bonusDetail.push({
      name: 'Volumen alto - revisar manualmente',
      ok: false,
      pts: 0,
      max: 10,
      bonus: true,
      warn: true
    });
  }

  return {
    coreScore,
    bonusScore,
    totalScore: coreScore + bonusScore,
    coreDetail,
    bonusDetail
  };
}

export function buildSignal(dSlow, dFast, i, kijunSlow, atrArr, scoreConfig, rawDataForVol, calib) {
  const s = dSlow[i], prev = dSlow[i-1], f = dFast[i];
  if (!s || !f || !s.kijun || !f.kijun || !s.senkouA || !s.senkouB) return null;
  
  // v9: pasar calib a detectRegime
  const regime = detectRegime(dSlow, i, atrArr, calib);
  const cloudTop = Math.max(s.senkouA, s.senkouB);
  const atrVal = atrArr ? atrArr[i] : null;
  const pbType = pullbackType(f, atrVal);
  
  // Cloud thickness
  const cloudThickness = Math.abs(s.senkouA - s.senkouB) / s.close;
  
  // v9: usar umbral calibrado del instrumento en lugar de 0.005 fijo
  const cloudThicknessMin = calib?.cloudThicknessMin ?? 0.005;
  
  const cond = {
    trend:   s.tenkan !== undefined && s.tenkan > s.kijun && s.close > s.kijun,
    cloud:   s.close > cloudTop &&
             s.senkouA > s.senkouB &&
             prev && s.senkouA > (prev.senkouA || 0) &&
             cloudThickness > cloudThicknessMin,    // ← umbral calibrado
    bounce:  f.close > f.kijun,
    chikou:  chikouClear(dSlow, i, kijunSlow)
  };
  
  const reversal = detectReversal(dFast, i);
  const volCheck = volumeConfirm(rawDataForVol, i);
  const { coreScore, bonusScore, totalScore, coreDetail, bonusDetail } = 
    calculateScore(cond, pbType, reversal, volCheck, cloudThickness, cloudThicknessMin);
  const { coreMin, totalMin } = scoreConfig;
  const valid = regime === 'TREND' && coreScore >= coreMin && totalScore >= totalMin;
  
  return {
    valid,
    coreScore,
    bonusScore,
    totalScore,
    coreDetail,
    bonusDetail,
    regime,
    pbType,
    atrVal,
    cloudThickness,
    cloudThicknessMin
  };
}
