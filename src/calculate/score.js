// src/calculate/score.js
// Cálculo de score y construcción de señales

import chikouClear, { pullbackType } from './signals.js';
import { detectRegime } from './regime.js';
import { detectReversal } from './reversal.js';
import { volumeConfirm } from './volume.js';

export function calculateScore(cond, pbType, reversal, volCheck) {
  let coreScore = 0;
  const coreDetail = [];
  
  // Tendencia (25 pts)
  coreScore += cond.trend ? 25 : 0;
  coreDetail.push({
    name: 'Tendencia — Tenkan > Kijun & precio > Kijun',
    ok: cond.trend,
    pts: cond.trend ? 25 : 0,
    max: 25
  });
  
  // Nube (25 pts)
  coreScore += cond.cloud ? 25 : 0;
  coreDetail.push({
    name: 'Nube — precio sobre cloud bullish en expansión',
    ok: cond.cloud,
    pts: cond.cloud ? 25 : 0,
    max: 25
  });
  
  // Pullback ATR (20 pts)
  let pbPts = 0;
  if (pbType === 'SUPERFICIAL') pbPts = 20;
  else if (pbType === 'NORMAL') pbPts = 10;
  coreScore += pbPts;
  coreDetail.push({
    name: `Pullback ATR (${pbType})`,
    ok: pbPts > 0,
    pts: pbPts,
    max: 20
  });
  
  // Rebote (15 pts)
  coreScore += cond.bounce ? 15 : 0;
  coreDetail.push({
    name: 'Rebote — close > Kijun fast TF',
    ok: cond.bounce,
    pts: cond.bounce ? 15 : 0,
    max: 15
  });
  
  // Chikou (15 pts)
  coreScore += cond.chikou ? 15 : 0;
  coreDetail.push({
    name: 'Chikou — close actual sobre máximos previos',
    ok: cond.chikou,
    pts: cond.chikou ? 15 : 0,
    max: 15
  });
  
  // Bonus
  let bonusScore = 0;
  const bonusDetail = [];
  
  // Reversal (+10 pts)
  const revOk = reversal.ok;
  bonusScore += revOk ? 10 : 0;
  bonusDetail.push({
    name: `Patrón reversal (${reversal.pattern})`,
    pattern: reversal.pattern,
    ok: revOk,
    pts: revOk ? 10 : 0,
    max: 10,
    nodata: false,
    bonus: true
  });
  
  // Volumen (+10 / -8 / 0)
  if (volCheck === null) {
    bonusDetail.push({
      name: 'Volumen pullback (sin datos en CSV)',
      ok: null,
      pts: 0,
      max: 10,
      nodata: true,
      bonus: true
    });
  } else if (volCheck === true) {
    bonusScore += 10;
    bonusDetail.push({
      name: 'Volumen pullback < 80% media (saludable)',
      ok: true,
      pts: 10,
      max: 10,
      nodata: false,
      bonus: true
    });
  } else {
    bonusScore -= 8;
    bonusDetail.push({
      name: 'Volumen alto en pullback (distribución -8)',
      ok: false,
      pts: -8,
      max: 10,
      nodata: false,
      bonus: true,
      penalty: true
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

export function buildSignal(dSlow, dFast, i, kijunSlow, atrArr, scoreConfig, rawDataForVol) {
  const s = dSlow[i], prev = dSlow[i-1], f = dFast[i];
  if (!s || !f || !s.kijun || !f.kijun || !s.senkouA || !s.senkouB) return null;
  
  const regime = detectRegime(dSlow, i, atrArr);
  const cloudTop = Math.max(s.senkouA, s.senkouB);
  const atrVal = atrArr ? atrArr[i] : null;
  const pbType = pullbackType(f, atrVal);
  
  // Cloud thickness filter
  const cloudThickness = Math.abs(s.senkouA - s.senkouB) / s.close;
  
  const cond = {
    trend:   s.tenkan !== undefined && s.tenkan > s.kijun && s.close > s.kijun,
    cloud:   s.close > cloudTop &&
             s.senkouA > s.senkouB &&
             prev && s.senkouA > (prev.senkouA || 0) &&
             cloudThickness > 0.005,
    bounce:  f.close > f.kijun,
    chikou:  chikouClear(dSlow, i, kijunSlow)
  };
  
  const reversal = detectReversal(dFast, i);
  const volCheck = volumeConfirm(rawDataForVol, i);
  const { coreScore, bonusScore, totalScore, coreDetail, bonusDetail } = calculateScore(cond, pbType, reversal, volCheck);
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
    atrVal
  };
}
