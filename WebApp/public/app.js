const state = {
  refs: {},
  musteriler: [],
  calisanlar: [],
  ilanlar: []
};

const statusEl = document.getElementById('connectionStatus');
const toastEl = document.getElementById('toast');

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');a
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
    const cells = columns.map((column) => `<td>${row[column.key] ?? ''}</td>`).join('');
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
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
      document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.page).classList.add('active');
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

  try {
    await refreshAll();
    updateIlanTypeFields();
  } catch (error) {
    showToast(error.message);
  }
}

main();
