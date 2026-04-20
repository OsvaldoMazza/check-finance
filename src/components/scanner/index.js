// src/components/scanner/index.js
// Scan Trade ON: analyze assets and render results

import { ichimokuOptimized, calcATR, buildSignal, calibrateParams, normalizeMarketData } from '../../calculate/index.js';
import { fetchAssetData } from '../apiConnector/index.js';

/**
 * Analyzes a single asset's data for a TRADE ON signal.
 *
 * @param {Array}  data      - OHLC rows
 * @param {string} assetType - 'crypto' | 'acciones'
 * @returns {Promise<boolean>}
 */
export async function analyzeAssetForTradeOn(data, assetType) {
  const normalized = normalizeMarketData(data);
  if (!normalized || normalized.length < 60) {
    console.log(`⚠️ Data insufficient: ${normalized ? normalized.length : 0} bars (need 60+)`);
    return false;
  }

  try {
    const slowP = assetType === 'crypto' ? [10, 30, 60] : [9, 26, 52];
    const fastP = assetType === 'crypto' ? [5,  15, 30] : [7, 22, 44];
    const atrPer = 14;
    const SCORE_CONFIG = assetType === 'crypto'
      ? { coreMin: 70, totalMin: 80 }
      : { coreMin: 70, totalMin: 75 };

    const slow = ichimokuOptimized(JSON.parse(JSON.stringify(normalized)), ...slowP);
    const fast = ichimokuOptimized(JSON.parse(JSON.stringify(normalized)), ...fastP);
    const atrArr    = calcATR(normalized, atrPer);
    const N         = normalized.length;
    const kijunSlow = slowP[1];

    const calib   = calibrateParams(slow, atrArr, N);
    const lastIdx = N - 1;
    const current = buildSignal(slow, fast, lastIdx, kijunSlow, atrArr, SCORE_CONFIG, normalized, calib);

    const isTradeOn = current && current.valid;
    console.log(`Result: ${isTradeOn ? '✅ TRADE ON' : '❌ No signal'}`);
    return isTradeOn;

  } catch (err) {
    console.error('❌ Error analyzing asset:', err);
    return false;
  }
}

/**
 * Scans a list of assets for TRADE ON signals.
 *
 * @param {object}   params
 * @param {Array}    params.assetsToScan      - Assets to scan
 * @param {object}   params.scannerConfig     - { delayBetweenRequests, maxAssetsToScan }
 * @param {string}   params.currentConnector  - 'coingecko' | 'twelvedata'
 * @param {string}   params.assetType         - 'crypto' | 'acciones'
 * @param {function} params.onProgress        - (scanned, total, name, found, errors) => void
 * @param {function} params.onTooManyErrors   - () => void
 * @returns {Promise<Array>} Assets with TRADE ON signal
 */
export async function runScan({ assetsToScan, scannerConfig, currentConnector, assetType, onProgress, onTooManyErrors }) {
  const tradeOnAssets = [];
  const totalAssets   = assetsToScan.length;
  let scanned = 0;
  let errors  = 0;

  for (const asset of assetsToScan) {
    scanned++;
    onProgress?.(scanned, totalAssets, asset.name, tradeOnAssets.length, errors);

    try {
      const data = await fetchAssetData(asset.id, currentConnector);

      if (!data || data.length < 60) {
        console.log(`⚠️ ${asset.name}: datos insuficientes (${data?.length || 0} barras)`);
        errors++;
        continue;
      }

      const hasTradeOn = await analyzeAssetForTradeOn(data, assetType);

      if (hasTradeOn) {
        tradeOnAssets.push(asset);
        console.log(`✅ TRADE ON encontrado: ${asset.name}`);
      }

      await new Promise(resolve => setTimeout(resolve, scannerConfig.delayBetweenRequests));

    } catch (err) {
      console.error(`Error escaneando ${asset.name}:`, err);
      errors++;
      if (errors > 5) {
        onTooManyErrors?.();
        break;
      }
    }
  }

  return tradeOnAssets;
}

/**
 * Populates the Trade ON results dropdown.
 *
 * @param {HTMLSelectElement} tradeOnResults - The select element
 * @param {Array}             tradeOnAssets  - Assets with TRADE ON signal
 */
export function renderTradeOnResults(tradeOnResults, tradeOnAssets) {
  tradeOnResults.innerHTML = `<option value="">📊 Resultados TRADE ON (${tradeOnAssets.length})</option>`;
  tradeOnAssets.forEach(asset => {
    const option = document.createElement('option');
    option.value       = asset.id;
    option.textContent = `🟢 ${asset.name}`;
    tradeOnResults.appendChild(option);
  });
}
