const state = {
  refs: {},
  musteriler: [],
  calisanlar: [],
  ilanlar: [],
  saleProperties: [],
  rentalProperties: []
};

const statusEl = document.getElementById('connectionStatus');
const toastEl = document.getElementById('toast');

let saleTableManager;
let rentalTableManager;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  window.setTimeout(() => toastEl.classList.remove('show'), 3200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Istek basarisiz.');
  }

  return data;
}

function fillSelect(select, items, placeholder = 'Seçiniz') {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  for (const item of items || []) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.ad || item.label;
    select.appendChild(option);
  }
}

function table(containerId, rows, columns) {
  const container = document.getElementById(containerId);

  if (!rows.length) {
    container.innerHTML = '<p>Kayıt yok.</p>';
    return;
  }

  const head = columns.map((column) => `<th>${column.title}</th>`).join('');
  const body = rows.map((row) => {
    const cells = columns.map((column) => {
      if (column.render) {
        return `<td>${column.render(row)}</td>`;
      }
      return `<td>${row[column.key] ?? ''}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  container.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function formData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  for (const checkbox of form.querySelectorAll('input[type="checkbox"]')) {
    data[checkbox.name] = checkbox.checked;
  }
  return data;
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '-';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
}

// Reusable Table Manager for Properties for Sale / Rent
class ListingTableManager {
  constructor(config) {
    this.containerId = config.containerId;
    this.apiUrl = config.apiUrl;
    this.columns = config.columns;
    this.type = config.type; // 'sale' or 'rental'
    this.searchId = config.searchId;
    this.refreshId = config.refreshId;
    this.countId = config.countId;
    this.stateKey = config.stateKey;
    
    this.rawData = [];
    this.filteredData = [];
    this.sortKey = null;
    this.sortDir = 'asc';
    this.searchQuery = '';
    
    this.init();
  }
  
  init() {
    const refreshBtn = document.getElementById(this.refreshId);
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.load());
    }
    
    const searchInput = document.getElementById(this.searchId);
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.filterAndRender();
      });
    }
  }
  
  async load() {
    this.renderLoading();
    try {
      const data = await api(this.apiUrl);
      this.rawData = data || [];
      state[this.stateKey] = this.rawData;
      this.filterAndRender();
    } catch (err) {
      this.renderError(err.message);
    }
  }
  
  filterAndRender() {
    if (this.searchQuery) {
      this.filteredData = this.rawData.filter(row => {
        return this.columns.some(col => {
          const val = row[col.key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(this.searchQuery);
        });
      });
    } else {
      this.filteredData = [...this.rawData];
    }
    
    if (this.sortKey) {
      this.filteredData.sort((a, b) => {
        let valA = a[this.sortKey] ?? '';
        let valB = b[this.sortKey] ?? '';
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return this.sortDir === 'asc' ? valA - valB : valB - valA;
        }
        
        valA = String(valA);
        valB = String(valB);
        return this.sortDir === 'asc' 
          ? valA.localeCompare(valB, 'tr') 
          : valB.localeCompare(valA, 'tr');
      });
    }
    
    const countEl = document.getElementById(this.countId);
    if (countEl) {
      countEl.textContent = this.filteredData.length;
    }
    
    this.render();
  }
  
  renderLoading() {
    const container = document.getElementById(this.containerId);
    container.innerHTML = `
      <div class="loadingState">
        <div class="spinner"></div>
        <span>SQL Server bağlantısından veriler alınıyor...</span>
      </div>
    `;
  }
  
  renderError(msg) {
    const container = document.getElementById(this.containerId);
    container.innerHTML = `
      <div class="emptyState" style="border-color: #fecdd3; background-color: #fff1f2;">
        <p style="color: #b91c1c;">Hata: ${msg}</p>
      </div>
    `;
  }
  
  render() {
    const container = document.getElementById(this.containerId);
    if (!this.filteredData.length) {
      container.innerHTML = `
        <div class="emptyState">
          <p>Kayıt bulunamadı.</p>
        </div>
      `;
      return;
    }
    
    const head = this.columns.map(column => {
      if (column.sortable !== false) {
        let sortClass = 'sortable';
        if (this.sortKey === column.key) {
          sortClass += ` ${this.sortDir}`;
        }
        return `<th class="${sortClass}" data-key="${column.key}">${column.title}</th>`;
      }
      return `<th>${column.title}</th>`;
    }).join('');
    
    const body = this.filteredData.map(row => {
      const cells = this.columns.map(column => {
        if (column.render) {
          return `<td>${column.render(row, this.type, this.stateKey)}</td>`;
        }
        return `<td>${row[column.key] ?? ''}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    
    container.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    
    container.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (this.sortKey === key) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortKey = key;
          this.sortDir = 'asc';
        }
        this.filterAndRender();
      });
    });
  }
}

// Columns definition for Property listings
const propertyColumns = [
  { key: 'İlan No', title: 'No' },
  { key: 'Başlık', title: 'Başlık' },
  { 
    key: 'Fiyat', 
    title: 'Fiyat', 
    render: (row) => formatCurrency(row['Fiyat']) 
  },
  { key: 'Emlak Tipi', title: 'Emlak Tipi' },
  { key: 'Oda Tipi', title: 'Oda Tipi' },
  { key: 'İl', title: 'İl' },
  { key: 'İlçe', title: 'İlçe' },
  { key: 'İlan Durumu', title: 'Durum' },
  {
    key: 'detay',
    title: 'İşlem',
    sortable: false,
    render: (row, type, stateKey) => `
      <button class="detailBtn" onclick="showListingDetail('${type}', ${row['İlan No']}, '${stateKey}')">Detay</button>
    `
  }
];

function showListingDetail(type, id, stateKey) {
  const list = state[stateKey] || [];
  const item = list.find((x) => x['İlan No'] === id);

  if (!item) {
    showToast('İlan detayları bulunamadı.');
    return;
  }

  const modalTitle = document.getElementById('modalTitle');
  const modalDetails = document.getElementById('modalDetails');
  const detailModal = document.getElementById('detailModal');

  modalTitle.textContent = `İlan Detayı (No: ${item['İlan No']})`;
  
  let typeSpecificHtml = '';
  if (type === 'rental') {
    typeSpecificHtml = `
      <div class="detailItem">
        <div class="detailLabel">Eşyalı Mı</div>
        <div class="detailValue"><span class="badge ${item['Eşyalı Mı'] === 'Evet' ? 'green' : 'red'}">${item['Eşyalı Mı']}</span></div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Aidat Tutarı</div>
        <div class="detailValue">${formatCurrency(item['Aidat Tutarı'])}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Depozito Tutarı</div>
        <div class="detailValue">${formatCurrency(item['Depozito Tutarı'])}</div>
      </div>
    `;
  } else {
    typeSpecificHtml = `
      <div class="detailItem">
        <div class="detailLabel">Tapu Durumu</div>
        <div class="detailValue"><span class="badge blue">${item['Tapu Durumu'] || '-'}</span></div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Krediye Uygun Mu</div>
        <div class="detailValue"><span class="badge ${item['Krediye Uygun Mu'] === 'Evet' ? 'green' : 'red'}">${item['Krediye Uygun Mu']}</span></div>
      </div>
    `;
  }

  modalDetails.innerHTML = `
    <div class="detailGrid">
      <div class="detailItem fullWidth">
        <div class="detailLabel">Başlık</div>
        <div class="detailValue" style="font-size: 15px; font-weight: 600; color: #0f172a;">${item['Başlık']}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Fiyat</div>
        <div class="detailValue priceValue">${formatCurrency(item['Fiyat'])}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">İlan Durumu</div>
        <div class="detailValue"><span class="badge green">${item['İlan Durumu'] || 'Aktif'}</span></div>
      </div>
      
      <div class="detailItem">
        <div class="detailLabel">Emlak Tipi</div>
        <div class="detailValue">${item['Emlak Tipi'] || '-'}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Oda Tipi</div>
        <div class="detailValue">${item['Oda Tipi'] || '-'}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Isıtma Tipi</div>
        <div class="detailValue">${item['Isıtma Tipi'] || '-'}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Metrekare</div>
        <div class="detailValue">${item['Metrekare']} m²</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Yapım Yılı / Bina Yaşı</div>
        <div class="detailValue">${item['Yapım Yılı']} (${item['Bina Yaşı'] ?? '-'} Yaşında)</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Bulunduğu Kat / Toplam Kat</div>
        <div class="detailValue">${item['Bulunduğu Kat'] ?? '-'} / ${item['Toplam Kat'] ?? '-'}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Balkon Sayısı / WC Sayısı</div>
        <div class="detailValue">${item['Balkon Sayısı'] ?? '0'} / ${item['WC Sayısı'] ?? '-'}</div>
      </div>
      
      ${typeSpecificHtml}

      <div class="detailItem fullWidth">
        <div class="detailLabel">Konum</div>
        <div class="detailValue">
          <strong>${item['İl']} / ${item['İlçe']}${item['Mahalle'] ? ' / ' + item['Mahalle'] : ''}</strong><br>
          <span style="font-size: 13px; color: #4b5563;">${item['Adres'] || 'Adres bilgisi girilmemiş.'}</span>
        </div>
      </div>

      <div class="detailItem">
        <div class="detailLabel">İlanı Ekleyen</div>
        <div class="detailValue">${item['İlanı Ekleyen'] || '-'}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Ekleyen Kişinin Rolü</div>
        <div class="detailValue">${item['Ekleyen Kişinin Rolü'] || '-'}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Eklenme Tarihi</div>
        <div class="detailValue">${item['Eklenme Tarihi'] || '-'}</div>
      </div>
      <div class="detailItem">
        <div class="detailLabel">Son Güncelleme</div>
        <div class="detailValue">${item['Güncellenme Tarihi'] || '-'}</div>
      </div>
    </div>
  `;

  detailModal.classList.add('show');
}

window.showListingDetail = showListingDetail;

function setupModalClose() {
  const detailModal = document.getElementById('detailModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      detailModal.classList.remove('show');
    });
  }

  window.addEventListener('click', (event) => {
    if (event.target === detailModal) {
      detailModal.classList.remove('show');
    }
  });
}

async function checkConnection() {
  try {
    await api('/api/health');
    statusEl.textContent = 'SQL Server bağlı';
    statusEl.className = 'status ok';
  } catch (error) {
    statusEl.textContent = 'SQL Server bağlantı hatası';
    statusEl.className = 'status fail';
    showToast(error.message);
  }
}

async function loadReferences() {
  state.refs = await api('/api/references');

  const musteriTipleri = document.getElementById('musteriTipleri');
  musteriTipleri.innerHTML = '';
  for (const tip of state.refs.musteri_tipleri || []) {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" name="tip_ids" value="${tip.id}"> ${tip.ad}`;
    musteriTipleri.appendChild(label);
  }

  fillSelect(document.querySelector('#calisanForm [name="personel_tipi_id"]'), state.refs.personel_tipleri);
  fillSelect(document.querySelector('#ilanForm [name="ilan_tipi_id"]'), state.refs.ilan_tipleri);
  fillSelect(document.querySelector('#ilanForm [name="emlak_tipi_id"]'), state.refs.emlak_tipleri);
  fillSelect(document.querySelector('#ilanForm [name="oda_tipi_id"]'), state.refs.oda_tipleri);
  fillSelect(document.querySelector('#ilanForm [name="isitma_tipi_id"]'), state.refs.isitma_tipleri);
  fillSelect(document.querySelector('#ilanForm [name="tapu_durumu_id"]'), state.refs.tapu_durumlari);
}

async function loadMusteriler() {
  state.musteriler = await api('/api/musteriler');
  table('musterilerTable', state.musteriler, [
    { key: 'id', title: 'No' },
    { key: 'ad', title: 'Ad' },
    { key: 'soyad', title: 'Soyad' },
    { key: 'telefon', title: 'Telefon' },
    { key: 'tc_kimlik_no', title: 'TC' },
    { key: 'tipler', title: 'Tipler' }
  ]);

  fillSelect(
    document.querySelector('#ilanForm [name="musteri_id"]'),
    state.musteriler.map((m) => ({ id: m.id, ad: `${m.ad} ${m.soyad} - ${m.tipler || 'Tipsiz'}` }))
  );
  document.getElementById('musteriCount').textContent = state.musteriler.length;
}

async function loadCalisanlar() {
  state.calisanlar = await api('/api/calisanlar');
  table('calisanlarTable', state.calisanlar, [
    { key: 'id', title: 'No' },
    { key: 'ad', title: 'Ad' },
    { key: 'soyad', title: 'Soyad' },
    { key: 'telefon', title: 'Telefon' },
    { key: 'personel_tipi', title: 'Tip' },
    { key: 'ise_baslama_tarihi', title: 'Başlama' }
  ]);

  fillSelect(
    document.querySelector('#ilanForm [name="calisan_id"]'),
    state.calisanlar.map((c) => ({ id: c.id, ad: `${c.ad} ${c.soyad}` }))
  );
  document.getElementById('calisanCount').textContent = state.calisanlar.length;
}

async function loadIlanlar() {
  state.ilanlar = await api('/api/ilanlar');
  table('ilanlarTable', state.ilanlar, [
    { key: 'id', title: 'No' },
    { key: 'baslik', title: 'Başlık' },
    { key: 'ilan_tipi', title: 'Tip' },
    { key: 'fiyat', title: 'Fiyat' },
    { key: 'il', title: 'İl' },
    { key: 'ilce', title: 'İlçe' },
    { key: 'musteri', title: 'Müşteri' },
    { key: 'calisan', title: 'Çalışan' },
    { key: 'ilan_durumu', title: 'Durum' }
  ]);
  document.getElementById('ilanCount').textContent = state.ilanlar.length;
}

async function loadKomisyonOzeti() {
  const rows = await api('/api/komisyon-ozeti');
  table('komisyonOzeti', rows, [
    { key: 'Komisyonu Alan', title: 'Personel' },
    { key: 'Kiralama Komisyonu Toplamı', title: 'Kiralama' },
    { key: 'Satış Komisyonu Toplamı', title: 'Satış' },
    { key: 'Toplam Komisyon', title: 'Toplam' }
  ]);
}

async function refreshAll() {
  await checkConnection();
  await loadReferences();
  await loadMusteriler();
  await loadCalisanlar();
  await loadIlanlar();
  await loadKomisyonOzeti();
  
  if (saleTableManager) await saleTableManager.load();
  if (rentalTableManager) await rentalTableManager.load();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', async () => {
      document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
      document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
      button.classList.add('active');
      const targetPage = button.dataset.page;
      document.getElementById(targetPage).classList.add('active');
      
      if (targetPage === 'saleProperties' && saleTableManager) {
        await saleTableManager.load();
      } else if (targetPage === 'rentalProperties' && rentalTableManager) {
        await rentalTableManager.load();
      }
    });
  });
}

function setupForms() {
  document.getElementById('musteriForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formData(form);
    data.tip_ids = [...form.querySelectorAll('input[name="tip_ids"]:checked')].map((input) => input.value);

    await api('/api/musteri-ekle', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    form.reset();
    await loadMusteriler();
    showToast('Müşteri eklendi.');
  });

  document.getElementById('calisanForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    await api('/api/calisan-ekle', {
      method: 'POST',
      body: JSON.stringify(formData(form))
    });
    form.reset();
    await loadCalisanlar();
    showToast('Çalışan eklendi.');
  });

  document.getElementById('ilanForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    await api('/api/ilan-ekle', {
      method: 'POST',
      body: JSON.stringify(formData(form))
    });
    form.reset();
    updateIlanTypeFields();
    await loadIlanlar();
    showToast('İlan eklendi.');
  });
}

function updateIlanTypeFields() {
  const select = document.querySelector('#ilanForm [name="ilan_tipi_id"]');
  const selected = state.refs.ilan_tipleri?.find((item) => String(item.id) === select.value)?.ad || '';
  const isKiralik = selected === 'Kiralık';
  const isSatilik = selected === 'Satılık';

  document.querySelectorAll('.kiralikOnly').forEach((el) => {
    el.style.display = isKiralik ? '' : 'none';
  });
  document.querySelectorAll('.satilikOnly').forEach((el) => {
    el.style.display = isSatilik ? '' : 'none';
  });
}

function setupRefreshButtons() {
  document.getElementById('refreshDashboard').addEventListener('click', refreshAll);

  document.querySelectorAll('[data-refresh]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button.dataset.refresh;
      if (target === 'musteriler') await loadMusteriler();
      if (target === 'calisanlar') await loadCalisanlar();
      if (target === 'ilanlar') await loadIlanlar();
    });
  });

  document.querySelector('#ilanForm [name="ilan_tipi_id"]').addEventListener('change', updateIlanTypeFields);
}

async function main() {
  setupTabs();
  setupForms();
  setupRefreshButtons();
  setupModalClose();

  saleTableManager = new ListingTableManager({
    containerId: 'salePropertiesTable',
    apiUrl: '/api/sale-properties',
    columns: propertyColumns,
    type: 'sale',
    searchId: 'saleSearch',
    refreshId: 'refreshSale',
    countId: 'saleCount',
    stateKey: 'saleProperties'
  });

  rentalTableManager = new ListingTableManager({
    containerId: 'rentalPropertiesTable',
    apiUrl: '/api/rental-properties',
    columns: propertyColumns,
    type: 'rental',
    searchId: 'rentalSearch',
    refreshId: 'refreshRental',
    countId: 'rentalCount',
    stateKey: 'rentalProperties'
  });

  try {
    await refreshAll();
    updateIlanTypeFields();
  } catch (error) {
    showToast(error.message);
  }
}

main();
