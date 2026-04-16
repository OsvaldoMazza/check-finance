// src/render/app.js
// Renderiza la UI principal y maneja selección de fuente de datos

export function renderApp({ onDataSourceSelected }) {
  const root = document.getElementById('app') || createRoot();
  root.innerHTML = `
    <div class="controls">
      <label>Fuente de datos:
        <select id="dataSource">
          <option value="csv">CSV</option>
          <option value="api">CoinGecko API</option>
        </select>
      </label>
      <span id="csvInputWrap">
        <input type="file" id="csvFile" accept=".csv">
      </span>
      <span id="apiInputWrap" style="display:none">
        Endpoint: <input type="text" id="apiEndpoint" value="/coins/bitcoin/market_chart">
        Params: <input type="text" id="apiParams" value="vs_currency=usd&days=90">
        API-KEY: <input type="text" id="apiKey">
      </span>
      <button id="loadBtn">Cargar datos</button>
    </div>
    <div id="output"></div>
  `;
  const dataSource = root.querySelector('#dataSource');
  const csvInputWrap = root.querySelector('#csvInputWrap');
  const apiInputWrap = root.querySelector('#apiInputWrap');
  dataSource.onchange = () => {
    if (dataSource.value === 'csv') {
      csvInputWrap.style.display = '';
      apiInputWrap.style.display = 'none';
    } else {
      csvInputWrap.style.display = 'none';
      apiInputWrap.style.display = '';
    }
  };
  root.querySelector('#loadBtn').onclick = () => {
    if (dataSource.value === 'csv') {
      const file = root.querySelector('#csvFile').files[0];
      onDataSourceSelected({ type: 'csv', file });
    } else {
      const endpoint = root.querySelector('#apiEndpoint').value;
      const params = Object.fromEntries(new URLSearchParams(root.querySelector('#apiParams').value));
      const apiKey = root.querySelector('#apiKey').value;
      onDataSourceSelected({ type: 'api', apiConfig: { endpoint, params, apiKey } });
    }
  };
}

function createRoot() {
  const div = document.createElement('div');
  div.id = 'app';
  document.body.prepend(div);
  return div;
}
