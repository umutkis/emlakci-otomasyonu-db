const state = {
  refs: {},
  musteriler: [],
  calisanlar: [],
  ilanlar: [],
  saleProperties: [],
  rentalProperties: [],
  salesHistory: [],
  rentalContracts: []
};

const statusEl = document.getElementById('connectionStatus');

let saleTableManager;
let rentalTableManager;
let salesHistoryTableManager;
let rentalContractsTableManager;

// Toast Container Creator
let toastContainer = document.getElementById('toastContainer');
if (!toastContainer) {
  toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  toastContainer.className = 'toastContainer';
  document.body.appendChild(toastContainer);
}

// Consecutive error tracking state
let lastErrorMsg = '';
let consecutiveErrorCount = 0;

function showNotification(message, type = 'info') {
  if (type === 'error') {
    if (message === lastErrorMsg) {
      consecutiveErrorCount++;
      if (consecutiveErrorCount > 5) {
        console.warn(`[DUPLICATE ERROR SUPPRESSED]: "${message}" has been triggered consecutively ${consecutiveErrorCount} times. Suppressing display.`);
        return;
      }
    } else {
      lastErrorMsg = message;
      consecutiveErrorCount = 1;
    }
  } else if (type === 'success') {
    // Reset consecutive tracking on successful actions
    lastErrorMsg = '';
    consecutiveErrorCount = 0;
  }

  const toast = document.createElement('div');
  toast.className = `toastItem ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';
  
  toast.innerHTML = `
    <span class="toastIcon">${icon}</span>
    <span class="toastMsg">${message}</span>
    <button class="toastCloseBtn">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  const close = () => {
    toast.classList.remove('show');
    toast.classList.add('fade-out');
    setTimeout(() => {
      toast.remove();
    }, 250);
  };
  
  toast.querySelector('.toastCloseBtn').addEventListener('click', close);
  setTimeout(close, 4000);
}

function showToast(message, type = 'info') {
  showNotification(message, type);
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
const salePropertyColumns = [
  { key: 'İlan No', title: 'No' },
  { key: 'Başlık', title: 'Başlık' },
  { key: 'Fiyat', title: 'Fiyat', render: (row) => formatCurrency(row['Fiyat']) },
  { key: 'Emlak Tipi', title: 'Emlak Tipi' },
  { key: 'Oda Tipi', title: 'Oda Tipi' },
  { key: 'İl', title: 'İl' },
  { key: 'İlçe', title: 'İlçe' },
  { key: 'İlan Durumu', title: 'Durum' },
  {
    key: 'actions',
    title: 'İşlem',
    sortable: false,
    render: (row) => `
      <div style="display: flex; gap: 6px;">
        <button class="detailBtn" onclick="showListingDetail('sale', ${row['İlan No']}, 'saleProperties')">Detay</button>
        <button class="soldBtn" style="background: #e6fcf5; color: #0ca678; border-color: #c3fae8;" onclick="openSoldModal(${row['İlan No']})">Satıldı</button>
        <button class="removeBtn" style="background: #fff5f5; color: #fa5252; border-color: #ffe3e3;" onclick="removeListing(${row['İlan No']}, 'sale')">Kaldır</button>
      </div>
    `
  }
];

const rentalPropertyColumns = [
  { key: 'İlan No', title: 'No' },
  { key: 'Başlık', title: 'Başlık' },
  { key: 'Fiyat', title: 'Fiyat', render: (row) => formatCurrency(row['Fiyat']) },
  { key: 'Emlak Tipi', title: 'Emlak Tipi' },
  { key: 'Oda Tipi', title: 'Oda Tipi' },
  { key: 'İl', title: 'İl' },
  { key: 'İlçe', title: 'İlçe' },
  { key: 'İlan Durumu', title: 'Durum' },
  {
    key: 'actions',
    title: 'İşlem',
    sortable: false,
    render: (row) => `
      <div style="display: flex; gap: 6px;">
        <button class="detailBtn" onclick="showListingDetail('rental', ${row['İlan No']}, 'rentalProperties')">Detay</button>
        <button class="rentedBtn" style="background: #e7f5ff; color: #228be6; border-color: #d0ebff;" onclick="openRentedModal(${row['İlan No']})">Kiralandı</button>
        <button class="removeBtn" style="background: #fff5f5; color: #fa5252; border-color: #ffe3e3;" onclick="removeListing(${row['İlan No']}, 'rental')">Kaldır</button>
      </div>
    `
  }
];

const salesHistoryColumns = [
  { key: 'id', title: 'No' },
  { key: 'İlan No', title: 'İlan No' },
  { key: 'Başlık', title: 'Başlık' },
  { key: 'Alıcı', title: 'Alıcı' },
  { key: 'Satıcı', title: 'Satıcı' },
  { key: 'Personel', title: 'Personel' },
  { key: 'Satış Tarihi', title: 'Satış Tarihi' },
  { key: 'Satış Tutarı', title: 'Tutar', render: (row) => formatCurrency(row['Satış Tutarı']) },
  { key: 'Kazanılan Komisyon', title: 'Komisyon', render: (row) => formatCurrency(row['Kazanılan Komisyon']) }
];

const rentalContractsColumns = [
  { key: 'id', title: 'No' },
  { key: 'İlan No', title: 'İlan No' },
  { key: 'Başlık', title: 'Başlık' },
  { key: 'Kiracı', title: 'Kiracı' },
  { key: 'Kiraya Veren', title: 'Kiraya Veren' },
  { key: 'Personel', title: 'Personel' },
  { key: 'Başlangıç Tarihi', title: 'Başlangıç' },
  { key: 'Süre (Ay)', title: 'Süre (Ay)' },
  { key: 'Bitiş Tarihi', title: 'Bitiş' },
  { key: 'Kira Tutarı', title: 'Kira Tutarı', render: (row) => formatCurrency(row['Kira Tutarı']) }
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
    showNotification('Database connection failed. (SQL Server bağlantı hatası)', 'error');
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
    { key: 'ise_baslama_tarihi', title: 'Başlama' },
    {
      key: 'actions',
      title: 'İşlem',
      render: (row) => `
        <button class="removeBtn" style="background: #fff5f5; color: #fa5252; border-color: #ffe3e3; min-height: 28px; padding: 4px 8px; font-size: 12px;" onclick="deleteEmployee(${row.id})">Sil</button>
      `
    }
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
    { key: 'fiyat', title: 'Fiyat', render: (row) => formatCurrency(row.fiyat) },
    { key: 'il', title: 'İl' },
    { key: 'ilce', title: 'İlçe' },
    { key: 'musteri', title: 'Müşteri' },
    { key: 'calisan', title: 'Çalışan' },
    { key: 'ilan_durumu', title: 'Durum' },
    {
      key: 'actions',
      title: 'İşlem',
      render: (row) => `
        <div style="display: flex; gap: 6px;">
          <button class="detailBtn" onclick="showMainListingDetail(${row.id})">Detay</button>
          <button class="editBtn" style="background: #f8f9fa; color: #495057; border-color: #dee2e6;" onclick="showEditListingModal(${row.id})">Düzenle</button>
        </div>
      `
    }
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
  if (salesHistoryTableManager) await salesHistoryTableManager.load();
  if (rentalContractsTableManager) await rentalContractsTableManager.load();
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll('.tab'));
  tabs.forEach((button) => {
    button.addEventListener('click', async () => {
      const activeTab = document.querySelector('.tab.active');
      if (activeTab === button) return;
      
      const currentTabIndex = tabs.indexOf(activeTab);
      const targetTabIndex = tabs.indexOf(button);
      
      const currentPageId = activeTab.dataset.page;
      const targetPageId = button.dataset.page;
      
      const currentPage = document.getElementById(currentPageId);
      const targetPage = document.getElementById(targetPageId);
      
      tabs.forEach((tab) => tab.classList.remove('active'));
      button.classList.add('active');
      
      const direction = targetTabIndex > currentTabIndex ? 'right' : 'left';
      
      targetPage.style.display = 'block';
      targetPage.className = `page ${direction === 'right' ? 'slide-in-right' : 'slide-in-left'}`;
      
      targetPage.offsetWidth; // force reflow
      
      currentPage.className = `page ${direction === 'right' ? 'slide-out-left' : 'slide-out-right'}`;
      targetPage.className = 'page active';
      
      setTimeout(() => {
        currentPage.style.display = 'none';
        currentPage.className = 'page';
      }, 400);

      if (targetPageId === 'saleProperties' && saleTableManager) {
        await saleTableManager.load();
      } else if (targetPageId === 'rentalProperties' && rentalTableManager) {
        await rentalTableManager.load();
      } else if (targetPageId === 'salesHistory' && salesHistoryTableManager) {
        await salesHistoryTableManager.load();
      } else if (targetPageId === 'rentalContracts' && rentalContractsTableManager) {
        await rentalContractsTableManager.load();
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

    try {
      const response = await api('/api/musteri-ekle', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      form.reset();
      await loadMusteriler();
      showNotification(response.message || 'Customer created successfully. (Müşteri başarıyla eklendi.)', 'success');
    } catch (err) {
      showNotification(err.message || 'Operation failed. (Müşteri eklenemedi.)', 'error');
    }
  });

  document.getElementById('calisanForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      const response = await api('/api/calisan-ekle', {
        method: 'POST',
        body: JSON.stringify(formData(form))
      });
      form.reset();
      await loadCalisanlar();
      showNotification(response.message || 'Çalışan başarıyla eklendi.', 'success');
    } catch (err) {
      showNotification(err.message || 'Operation failed. (Çalışan eklenemedi.)', 'error');
    }
  });

  document.getElementById('ilanForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formData(form);

    // Frontend validation for customer role
    const selectedMusteriId = Number(data.musteri_id);
    const selectedMusteri = state.musteriler.find(m => m.id === selectedMusteriId);
    const selectedIlanTipiId = Number(data.ilan_tipi_id);
    const ilanTipiName = state.refs.ilan_tipleri?.find(item => Number(item.id) === selectedIlanTipiId)?.ad;
    
    if (selectedMusteri) {
      const customerRoles = selectedMusteri.tipler ? selectedMusteri.tipler.split(', ') : [];
      if (ilanTipiName === 'Satılık' && !customerRoles.includes('Satıcı')) {
        showNotification('Seçilen müşteri "Satıcı" rolüne sahip olmalıdır.', 'error');
        return;
      }
      if (ilanTipiName === 'Kiralık' && !customerRoles.includes('Kiraya Veren')) {
        showNotification('Seçilen müşteri "Kiraya Veren" rolüne sahip olmalıdır.', 'error');
        return;
      }
    }

    try {
      const response = await api('/api/ilan-ekle', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      form.reset();
      updateIlanTypeFields();
      await loadIlanlar();
      showNotification(response.message || 'İlan başarıyla eklendi.', 'success');
    } catch (err) {
      showNotification(err.message || 'Operation failed. (İlan eklenemedi.)', 'error');
    }
  });

  // Sold Form
  document.getElementById('soldForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const ilanId = form.querySelector('[name="ilan_id"]').value;
    const data = {
      alici_id: form.querySelector('[name="alici_id"]').value,
      personel_id: form.querySelector('[name="personel_id"]').value,
      komisyon_tutari: form.querySelector('[name="komisyon_tutari"]').value
    };
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    try {
      const response = await api(`/api/sale-properties/${ilanId}/sold`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      closeModal('soldModal');
      showNotification(response.message, 'success');
      await refreshAll();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Rented Form
  document.getElementById('rentedForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const ilanId = form.querySelector('[name="ilan_id"]').value;
    const data = {
      kiraci_id: form.querySelector('[name="kiraci_id"]').value,
      personel_id: form.querySelector('[name="personel_id"]').value,
      komisyon_tutari: form.querySelector('[name="komisyon_tutari"]').value
    };
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    try {
      const response = await api(`/api/rental-properties/${ilanId}/rented`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      closeModal('rentedModal');
      showNotification(response.message, 'success');
      await refreshAll();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Edit Listing Form
  document.getElementById('editIlanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const id = form.querySelector('[name="id"]').value;
    const data = formData(form);
    
    try {
      const response = await api(`/api/ilan-duzenle/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      closeModal('editModal');
      showNotification(response.message, 'success');
      await refreshAll();
    } catch (err) {
      showNotification(err.message, 'error');
    }
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

function openSoldModal(ilanId) {
  const modal = document.getElementById('soldModal');
  const form = document.getElementById('soldForm');
  form.reset();
  form.querySelector('[name="ilan_id"]').value = ilanId;
  
  const buyers = state.musteriler.filter(m => m.tipler && m.tipler.split(', ').includes('Alıcı'));
  fillSelect(form.querySelector('[name="alici_id"]'), buyers.map(m => ({ id: m.id, ad: `${m.ad} ${m.soyad}` })), 'Alıcı Seçiniz');
  fillSelect(form.querySelector('[name="personel_id"]'), state.calisanlar.map(c => ({ id: c.id, ad: `${c.ad} ${c.soyad}` })), 'Personel Seçiniz');
  
  const listing = state.saleProperties.find(p => p['İlan No'] === ilanId);
  if (listing) {
    const price = Number(listing['Fiyat']);
    form.querySelector('[name="komisyon_tutari"]').value = Math.round(price * 0.05);
  }

  modal.classList.add('show');
}

function openRentedModal(ilanId) {
  const modal = document.getElementById('rentedModal');
  const form = document.getElementById('rentedForm');
  form.reset();
  form.querySelector('[name="ilan_id"]').value = ilanId;
  
  const tenants = state.musteriler.filter(m => m.tipler && m.tipler.split(', ').includes('Kiracı'));
  fillSelect(form.querySelector('[name="kiraci_id"]'), tenants.map(m => ({ id: m.id, ad: `${m.ad} ${m.soyad}` })), 'Kiracı Seçiniz');
  fillSelect(form.querySelector('[name="personel_id"]'), state.calisanlar.map(c => ({ id: c.id, ad: `${c.ad} ${c.soyad}` })), 'Personel Seçiniz');
  
  const listing = state.rentalProperties.find(p => p['İlan No'] === ilanId);
  if (listing) {
    const price = Number(listing['Fiyat']);
    form.querySelector('[name="komisyon_tutari"]').value = price;
  }

  modal.classList.add('show');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

async function removeListing(ilanId, type) {
  const confirmed = confirm('Bu ilanı kalıcı olarak kaldırmak istediğinize emin misiniz?');
  if (!confirmed) return;
  
  try {
    const response = await api(`/api/ilan-sil/${ilanId}`, {
      method: 'DELETE'
    });
    showNotification(response.message, 'success');
    await refreshAll();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function deleteEmployee(id) {
  const confirmed = confirm('Bu çalışanı silmek istediğinize emin misiniz?');
  if (!confirmed) return;
  
  try {
    const response = await api(`/api/calisan-sil/${id}`, {
      method: 'DELETE'
    });
    showNotification(response.message, 'success');
    await loadCalisanlar();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function showMainListingDetail(ilanId) {
  const listing = state.ilanlar.find(i => i.id === ilanId);
  if (!listing) {
    showNotification('İlan detayları bulunamadı.', 'error');
    return;
  }
  
  const type = listing.ilan_tipi === 'Kiralık' ? 'rental' : 'sale';
  const stateKey = type === 'rental' ? 'rentalProperties' : 'saleProperties';
  
  if (state[stateKey].length === 0) {
    if (type === 'rental') {
      await rentalTableManager.load();
    } else {
      await saleTableManager.load();
    }
  }
  
  showListingDetail(type, ilanId, stateKey);
}

async function showEditListingModal(ilanId) {
  try {
    const listing = await api(`/api/ilanlar/${ilanId}`);
    
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editIlanForm');
    form.reset();
    
    form.querySelector('[name="id"]').value = listing.id;
    form.querySelector('[name="baslik"]').value = listing.baslik;
    form.querySelector('[name="fiyat"]').value = listing.fiyat;
    
    fillSelect(form.querySelector('[name="ilan_tipi_id"]'), state.refs.ilan_tipleri);
    fillSelect(form.querySelector('[name="emlak_tipi_id"]'), state.refs.emlak_tipleri);
    fillSelect(form.querySelector('[name="oda_tipi_id"]'), state.refs.oda_tipleri);
    fillSelect(form.querySelector('[name="isitma_tipi_id"]'), state.refs.isitma_tipleri);
    fillSelect(form.querySelector('[name="tapu_durumu_id"]'), state.refs.tapu_durumlari);
    
    fillSelect(
      form.querySelector('[name="musteri_id"]'),
      state.musteriler.map((m) => ({ id: m.id, ad: `${m.ad} ${m.soyad} - ${m.tipler || 'Tipsiz'}` }))
    );
    fillSelect(
      form.querySelector('[name="calisan_id"]'),
      state.calisanlar.map((c) => ({ id: c.id, ad: `${c.ad} ${c.soyad}` }))
    );
    
    form.querySelector('[name="ilan_tipi_id"]').value = listing.ilan_tipi_id;
    form.querySelector('[name="emlak_tipi_id"]').value = listing.emlak_tipi_id;
    form.querySelector('[name="oda_tipi_id"]').value = listing.oda_tipi_id;
    form.querySelector('[name="isitma_tipi_id"]').value = listing.isitma_tipi_id;
    form.querySelector('[name="musteri_id"]').value = listing.musteri_id;
    form.querySelector('[name="calisan_id"]').value = listing.calisan_id;
    
    form.querySelector('[name="il"]').value = listing.il;
    form.querySelector('[name="ilce"]').value = listing.ilce;
    form.querySelector('[name="mahalle"]').value = listing.mahalle || '';
    form.querySelector('[name="adres"]').value = listing.adres || '';
    form.querySelector('[name="yapim_yili"]').value = listing.yapim_yili;
    form.querySelector('[name="metrekare"]').value = listing.metrekare;
    form.querySelector('[name="bulundugu_kat"]').value = listing.bulundugu_kat || '';
    form.querySelector('[name="toplam_kat"]').value = listing.toplam_kat || '';
    form.querySelector('[name="balkon_sayisi"]').value = listing.balkon_sayisi || '';
    form.querySelector('[name="wc_sayisi"]').value = listing.wc_sayisi || '';
    
    const selectedIlanTipi = state.refs.ilan_tipleri?.find(item => Number(item.id) === Number(listing.ilan_tipi_id))?.ad;
    const isKiralik = selectedIlanTipi === 'Kiralık';
    const isSatilik = selectedIlanTipi === 'Satılık';
    
    document.querySelectorAll('.editKiralikOnly').forEach((el) => {
      el.style.display = isKiralik ? '' : 'none';
    });
    document.querySelectorAll('.editSatilikOnly').forEach((el) => {
      el.style.display = isSatilik ? '' : 'none';
    });
    
    if (isKiralik) {
      form.querySelector('[name="aidat_tutari"]').value = listing.aidat_tutari || '';
      form.querySelector('[name="depozito_tutari"]').value = listing.depozito_tutari || '';
      form.querySelector('[name="esyali_mi"]').checked = Boolean(listing.esyali_mi);
    } else if (isSatilik) {
      form.querySelector('[name="tapu_durumu_id"]').value = listing.tapu_durumu_id || '';
      form.querySelector('[name="krediye_uygun_mu"]').checked = Boolean(listing.krediye_uygun_mu);
    }
    
    modal.classList.add('show');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

window.openSoldModal = openSoldModal;
window.openRentedModal = openRentedModal;
window.closeModal = closeModal;
window.removeListing = removeListing;
window.deleteEmployee = deleteEmployee;
window.showMainListingDetail = showMainListingDetail;
window.showEditListingModal = showEditListingModal;

async function main() {
  setupTabs();
  setupForms();
  setupRefreshButtons();
  setupModalClose();

  saleTableManager = new ListingTableManager({
    containerId: 'salePropertiesTable',
    apiUrl: '/api/sale-properties',
    columns: salePropertyColumns,
    type: 'sale',
    searchId: 'saleSearch',
    refreshId: 'refreshSale',
    countId: 'saleCount',
    stateKey: 'saleProperties'
  });

  rentalTableManager = new ListingTableManager({
    containerId: 'rentalPropertiesTable',
    apiUrl: '/api/rental-properties',
    columns: rentalPropertyColumns,
    type: 'rental',
    searchId: 'rentalSearch',
    refreshId: 'refreshRental',
    countId: 'rentalCount',
    stateKey: 'rentalProperties'
  });

  salesHistoryTableManager = new ListingTableManager({
    containerId: 'salesHistoryTable',
    apiUrl: '/api/sales-history',
    columns: salesHistoryColumns,
    type: 'salesHistory',
    searchId: 'salesHistorySearch',
    refreshId: 'refreshSalesHistory',
    countId: 'salesHistoryCount',
    stateKey: 'salesHistory'
  });

  rentalContractsTableManager = new ListingTableManager({
    containerId: 'rentalContractsTable',
    apiUrl: '/api/rental-contracts',
    columns: rentalContractsColumns,
    type: 'rentalContracts',
    searchId: 'rentalContractsSearch',
    refreshId: 'refreshRentalContracts',
    countId: 'rentalContractsCount',
    stateKey: 'rentalContracts'
  });

  try {
    await refreshAll();
    updateIlanTypeFields();
  } catch (error) {
    showToast(error.message);
  }
}

main();
