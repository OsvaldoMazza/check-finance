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

  // Tendencia: 25 si strong, 20 si valida pero debil
  const trendPts = cond.trend ? (cond.trendStrong ? 25 : 20) : 0;
  coreScore += trendPts;
  coreDetail.push({
    name: cond.trend
      ? (cond.trendStrong
          ? 'Tendencia — fuerte (Tenkan/Kijun bien separados)'
          : 'Tendencia — valida pero debil (spread TK bajo)')
      : 'Tendencia — Tenkan > Kijun & precio > Kijun',
    ok: cond.trend,
    pts: trendPts,
    max: 25
  });

  // Nube (25 pts) - con detalle de espesor
  coreScore += cond.cloud ? 25 : 0;
  const cloudPct = cloudThickness != null ? (cloudThickness * 100).toFixed(2) + '%' : '—';
  const cloudName = cond.cloud
    ? `Nube — bullish, expansión, espesor ${cloudPct} (mín ${minPct}%)`
    : cloudThickness != null && cloudThickness <= (cloudThicknessMin ?? 0.005)
      ? `Nube — delgada (${cloudPct} < ${minPct}%) — soporte débil`
      : `Nube — precio bajo o sin expansión (espesor ${cloudPct})`;
  coreDetail.push({
    name: cloudName,
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

  // Volumen (+10 / 0 / 0): warning visual si es alto, sin penalizacion.
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
    bonusDetail.push({
      name: 'Volumen alto en pullback — revisar manualmente',
      ok: false,
      pts: 0,
      max: 10,
      nodata: false,
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
  const s = dSlow[i], prev = dSlow[i - 1], f = dFast[i];
  if (!s || !f || !s.kijun || !f.kijun || !s.senkouA || !s.senkouB) return null;

  const regime = detectRegime(dSlow, i, atrArr, calib);
  const cloudTop = Math.max(s.senkouA, s.senkouB);
  const atrVal = atrArr ? atrArr[i] : null;

  // Pullback lookback (ultimas 3 barras del fast TF)
  let pbType = 'NO_PULLBACK';
  let pbLb = 0;
  const LOOKBACK = 3;
  for (let lb = 0; lb < LOOKBACK; lb++) {
    const lbIdx = i - lb;
    if (lbIdx < 0) break;
    const fBar = dFast[lbIdx];
    const atrLb = atrArr ? atrArr[lbIdx] : null;
    const pt = pullbackType(fBar, atrLb);
    if (pt === 'SUPERFICIAL' || pt === 'NORMAL') {
      pbType = pt;
      pbLb = lb;
      break;
    }
    if (pt === 'PROFUNDO' && pbType === 'NO_PULLBACK') {
      pbType = 'PROFUNDO';
      pbLb = lb;
    }
  }

  const cloudThickness = Math.abs(s.senkouA - s.senkouB) / s.close;

  const cloudThicknessMin = calib?.cloudThicknessMin ?? 0.003;

  const trendStrength = (s.tenkan !== undefined && s.kijun && s.close > 0)
    ? Math.abs(s.tenkan - s.kijun) / s.close
    : 0;
  const tkSpreadMin = calib?.tkSpreadMin ?? 0.003;

  const cond = {
    trend: s.tenkan !== undefined && s.tenkan > s.kijun && s.close > s.kijun,
    trendStrong: trendStrength > tkSpreadMin,
    cloud: s.close > cloudTop &&
           s.senkouA > s.senkouB &&
           prev && s.senkouA > (prev.senkouA || 0) &&
           cloudThickness > cloudThicknessMin,
    bounce: f.close > f.kijun,
    chikou: chikouClear(dSlow, i, kijunSlow)
  };

  const reversal = detectReversal(dFast, i, pbLb);
  const volCheck = volumeConfirm(rawDataForVol, i - pbLb);
  const { coreScore, bonusScore, totalScore, coreDetail, bonusDetail } =
    calculateScore(cond, pbType, reversal, volCheck, cloudThickness, cloudThicknessMin);
  const { coreMin, totalMin } = scoreConfig;
  const tradablePullback = pbType === 'SUPERFICIAL' || pbType === 'NORMAL';
  const valid = regime === 'TREND' && tradablePullback && coreScore >= coreMin && totalScore >= totalMin;

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
    cloudThicknessMin,
    trendStrength,
    tkSpreadMin
  };
}
