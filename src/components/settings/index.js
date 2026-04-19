// src/components/settings/index.js
// Settings modal: open/close, save scanner config, manage selected assets

/**
 * @param {object} elements  - DOM element refs for the modal
 * @param {function} getState - () => { scannerConfig, selectedAssetsForScan, cryptoListData }
 * @param {function} setState - (updates) => void
 * @param {function} onStatus - (msg: string) => void
 * @returns {{ updateSelectedAssetsCount: function }}
 */
export function initSettings({
  btnSettings, settingsModal, closeSettings, saveSettings, cancelSettings,
  scanDelay, scanLimit, selectedAssetsCount, selectAllAssets, clearAllAssets,
  getState, setState, onStatus
}) {
  function updateSelectedAssetsCount() {
    const count = getState().selectedAssetsForScan.length;
    selectedAssetsCount.textContent = count === 0
      ? 'Ningún activo seleccionado (se usarán los primeros N de la lista)'
      : `${count} activo${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''} para scan`;
  }

  btnSettings.addEventListener('click', () => {
    const { scannerConfig } = getState();
    scanDelay.value = scannerConfig.delayBetweenRequests;
    scanLimit.value = scannerConfig.maxAssetsToScan;
    updateSelectedAssetsCount();
    settingsModal.classList.remove('hidden');
  });

  closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
  cancelSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
  });

  selectAllAssets.addEventListener('click', () => {
    const { cryptoListData } = getState();
    const all = cryptoListData.map(asset => asset.id);
    setState({ selectedAssetsForScan: all });
    localStorage.setItem('selectedAssetsForScan', JSON.stringify(all));
    updateSelectedAssetsCount();
    onStatus(`✅ Seleccionados todos los activos (${all.length})`);
    console.log('📌 Todos los activos seleccionados:', all.length);
  });

  clearAllAssets.addEventListener('click', () => {
    setState({ selectedAssetsForScan: [] });
    localStorage.setItem('selectedAssetsForScan', JSON.stringify([]));
    updateSelectedAssetsCount();
    onStatus('🗑️ Selección de activos limpiada');
    console.log('📌 Selección limpiada');
  });

  saveSettings.addEventListener('click', () => {
    const newDelay = parseInt(scanDelay.value);
    const newLimit = parseInt(scanLimit.value);

    if (newDelay < 1000 || newDelay > 30000) {
      alert('⚠️ El delay debe estar entre 1000ms (1seg) y 30000ms (30seg)');
      return;
    }
    if (newLimit < 5 || newLimit > 100) {
      alert('⚠️ El límite debe estar entre 5 y 100 activos');
      return;
    }

    const scannerConfig = { delayBetweenRequests: newDelay, maxAssetsToScan: newLimit };
    setState({ scannerConfig });
    localStorage.setItem('scannerConfig', JSON.stringify(scannerConfig));
    console.log('✅ Configuración guardada:', scannerConfig);
    onStatus(`⚙️ Configuración actualizada: ${newDelay}ms delay, ${newLimit} activos max`);
    settingsModal.classList.add('hidden');
  });

  return { updateSelectedAssetsCount };
}
