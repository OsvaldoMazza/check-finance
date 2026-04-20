// src/components/assetSearch/index.js
// Asset search dropdown: render list and wire search/click events

/**
 * Renders the crypto/asset dropdown list.
 *
 * @param {HTMLElement} cryptoList        - The list container element
 * @param {Array}       assets            - Filtered assets to display
 * @param {string}      selectedAssetId   - Currently selected asset id
 * @param {Array}       selectedAssetsForScan - Asset ids checked for scan
 * @param {object}      callbacks
 * @param {function}    callbacks.onAssetClick     - (id, name) => void
 * @param {function}    callbacks.onCheckboxToggle - (id, checked) => void
 */
export function renderCryptoList(cryptoList, assets, selectedAssetId, selectedAssetsForScan, callbacks) {
  if (!assets || assets.length === 0) {
    cryptoList.innerHTML = '<div class="crypto-item" style="color:var(--text-muted);cursor:default;">No se encontraron resultados</div>';
    return;
  }

  cryptoList.innerHTML = assets.map(asset => {
    const isChecked      = selectedAssetsForScan.includes(asset.id);
    const secondaryInfo  = asset.type
      ? `<span class="crypto-item-type">${asset.type}</span>`
      : `<span class="crypto-item-symbol">${asset.symbol.toUpperCase()}</span>`;

    return `
      <div class="crypto-item ${asset.id === selectedAssetId ? 'selected' : ''}" data-id="${asset.id}" data-name="${asset.name}">
        <input type="checkbox" class="asset-checkbox" data-asset-id="${asset.id}" ${isChecked ? 'checked' : ''} />
        <span class="crypto-item-name">${asset.name}</span>
        ${secondaryInfo}
      </div>
    `;
  }).join('');

  cryptoList.querySelectorAll('.asset-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      const assetId = checkbox.getAttribute('data-asset-id');
      callbacks.onCheckboxToggle(assetId, checkbox.checked);
    });
  });

  cryptoList.querySelectorAll('.crypto-item').forEach(item => {
    const itemId = item.getAttribute('data-id');
    if (!itemId) return;
    item.addEventListener('click', async (e) => {
      if (e.target.classList.contains('asset-checkbox')) return;
      callbacks.onAssetClick(itemId, item.getAttribute('data-name'));
    });
  });
}

/**
 * Wires input/focus/outside-click events for the asset search dropdown.
 *
 * @param {object}   params
 * @param {HTMLElement} params.cryptoSearch  - Search input element
 * @param {HTMLElement} params.cryptoList    - Dropdown list element
 * @param {function}    params.onRenderList  - Called to re-render the list
 */
export function initAssetSearch({ cryptoSearch, cryptoList, onRenderList }) {
  cryptoSearch.addEventListener('focus', () => {
    cryptoList.classList.remove('hidden');
    onRenderList();
  });

  cryptoSearch.addEventListener('input', () => {
    onRenderList();
    cryptoList.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.crypto-dropdown')) {
      cryptoList.classList.add('hidden');
    }
  });
}
