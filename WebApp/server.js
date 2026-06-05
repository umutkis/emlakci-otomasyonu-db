require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const { writeLog } = require('./logger');
const app = express();
const port = Number(process.env.PORT || 3000);

const dbConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
  }
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }
  return poolPromise;
}

// Consecutive error tracking variables for the backend
let lastBackendErrorKey = null;
let consecutiveBackendErrorCount = 0;

// Gelişmiş Merkezi Hata Yakalayıcı (req destekli ve dinamik UserID yapılı)
async function handleError(req, res, error, actionContext = 'SISTEM_HATASI') {
  const errorMsg = error.message || 'İşlem tamamlanamadı.';
  const currentErrorKey = `${actionContext}:${errorMsg}`;

  if (currentErrorKey === lastBackendErrorKey) {
    consecutiveBackendErrorCount++;
    if (consecutiveBackendErrorCount > 5) {
      console.log(`[BACKEND DUPLICATE ERROR SUPPRESSED]: Context=${actionContext}, Error="${errorMsg}" has been triggered consecutively ${consecutiveBackendErrorCount} times. Blocking logging & DB write.`);
      return res.status(400).json({
        success: false,
        message: errorMsg
      });
    }
  } else {
    lastBackendErrorKey = currentErrorKey;
    consecutiveBackendErrorCount = 1;
  }

  console.error(`\n!!! [${actionContext}] Bir Hata Yakalandı:`, error.message);
  
  try {
    const pool = await getPool();
    
    // İstekten dinamik kullanıcı ID'sini çekiyoruz, yoksa varsayılan 1 (Admin) basıyoruz
    const aktifKullaniciId = req.user?.id || req.session?.userId || 1;
    const logDetay = `Rota: ${req.originalUrl} | Hata: ${error.message}`;
    
    // SQL NOT NULL kuralına takılmadan logu kaydediyoruz
    await writeLog(pool, aktifKullaniciId, actionContext, logDetay);
  } catch (logErr) {
    console.error("Hatayı SQL'e yazarken logger da patladı:", logErr.message);
  }
  
  res.status(400).json({
    success: false,
    message: errorMsg
  });
}

app.use(cors());
app.use(express.json());

// Prevent duplicate writes caused by repeated clicks
const activeOperations = new Set();
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT') {
    const reqKey = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`;
    if (activeOperations.has(reqKey)) {
      console.log(`[DUPLICATE REQUEST SUPPRESSED]: ${reqKey}`);
      return res.status(409).json({
        success: false,
        message: 'İşleminiz şu anda gerçekleştiriliyor, lütfen tekrar tıklamayınız.'
      });
    }
    activeOperations.add(reqKey);
    const cleanup = () => activeOperations.delete(reqKey);
    res.on('finish', cleanup);
    res.on('close', cleanup);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Middleware to reset consecutive backend error counters on successful requests
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      lastBackendErrorKey = null;
      consecutiveBackendErrorCount = 0;
    }
    return originalJson.apply(this, arguments);
  };
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS ok');
    res.json({ ok: result.recordset[0].ok === 1 });
  } catch (error) {
    await handleError(req, res, error, 'HEALTH_CHECK_HATA');
  }
});

app.get('/api/references', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 'personel_tipleri' AS liste, id, tip_adi AS ad FROM personel_tipleri
      UNION ALL SELECT 'musteri_tipleri', id, tip_adi FROM musteri_tipleri
      UNION ALL SELECT 'ilan_tipleri', id, tip_adi FROM ilan_tipleri
      UNION ALL SELECT 'emlak_tipleri', id, tip_adi FROM emlak_tipleri
      UNION ALL SELECT 'oda_tipleri', id, tip_adi FROM oda_tipleri
      UNION ALL SELECT 'isitma_tipleri', id, tip_adi FROM isitma_tipleri
      UNION ALL SELECT 'ilan_durumlari', id, durum_adi FROM ilan_durumlari
      UNION ALL SELECT 'tapu_durumlari', id, durum_adi FROM tapu_durumlari
      ORDER BY liste, id;
    `);

    const grouped = {};
    for (const row of result.recordset) {
      grouped[row.liste] ||= [];
      grouped[row.liste].push({ id: row.id, ad: row.ad });
    }

    res.json(grouped);
  } catch (error) {
    await handleError(req, res, error, 'REFERENCES_HATA');
  }
});

app.get('/api/musteriler', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        m.id,
        m.ad,
        m.soyad,
        m.tc_kimlik_no,
        m.telefon,
        STRING_AGG(mt.tip_adi, ', ') AS tipler
      FROM musteriler m
      LEFT JOIN musteri_tipi_atamalari mta ON mta.musteri_id = m.id
      LEFT JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
      GROUP BY m.id, m.ad, m.soyad, m.tc_kimlik_no, m.telefon
      ORDER BY m.id DESC;
    `);
    res.json(result.recordset);
  } catch (error) {
    await handleError(req, res, error, 'MUSTERI_LISTELE_HATA');
  }
});

app.post('/api/musteri-ekle', async (req, res) => {
  const { ad, soyad, tc_kimlik_no, telefon, tip_ids = [] } = req.body;
  const mevcutKullaniciId = req.user?.id || req.session?.userId || 1;

  try {
    const pool = await getPool();
    
    // Duplicate Check
    const dupCheck = await pool.request()
      .input('telefon', sql.VarChar(11), telefon)
      .query('SELECT TOP 1 id FROM musteriler WHERE telefon = @telefon');
    if (dupCheck.recordset.length > 0) {
      throw new Error('Record already exists. (Bu telefon numarasıyla kayıtlı müşteri zaten var.)');
    }
    
    if (tc_kimlik_no) {
      const tcCheck = await pool.request()
        .input('tc', sql.VarChar(11), tc_kimlik_no)
        .query('SELECT TOP 1 id FROM musteriler WHERE tc_kimlik_no = @tc');
      if (tcCheck.recordset.length > 0) {
        throw new Error('Record already exists. (Bu T.C. kimlik numarasıyla kayıtlı müşteri zaten var.)');
      }
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const insert = await new sql.Request(transaction)
        .input('ad', sql.NVarChar(50), ad)
        .input('soyad', sql.NVarChar(50), soyad)
        .input('tc', sql.VarChar(11), tc_kimlik_no || null)
        .input('telefon', sql.VarChar(11), telefon)
        .query(`
          DECLARE @InsertedIds TABLE (id INT);

          INSERT INTO musteriler (ad, soyad, tc_kimlik_no, telefon)
          OUTPUT inserted.id INTO @InsertedIds
          VALUES (@ad, @soyad, @tc, @telefon);

          SELECT id FROM @InsertedIds;
        `);

      const musteriId = insert.recordset[0].id;

      for (const tipId of tip_ids) {
        await new sql.Request(transaction)
          .input('musteri_id', sql.Int, musteriId)
          .input('tip_id', sql.Int, Number(tipId))
          .query(`
            INSERT INTO musteri_tipi_atamalari (musteri_id, musteri_tipi_id)
            VALUES (@musteri_id, @tip_id);
          `);
      }

      await transaction.commit();
      
      // Başarılı işlem logu
      await writeLog(pool, mevcutKullaniciId, 'MUSTERI_EKLE', `Yeni müşteri eklendi: ${ad} ${soyad} (ID: ${musteriId})`);

      res.status(201).json({
        success: true,
        message: 'Müşteri başarıyla eklendi.',
        id: musteriId
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    await handleError(req, res, error, 'MUSTERI_EKLE_HATA');
  }
});

app.get('/api/calisanlar', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT c.id, c.ad, c.soyad, c.telefon, c.ise_baslama_tarihi, pt.tip_adi AS personel_tipi
      FROM calisanlar c
      INNER JOIN personel_tipleri pt ON pt.id = c.personel_tipi_id
      ORDER BY c.id DESC;
    `);
    res.json(result.recordset);
  } catch (error) {
    await handleError(req, res, error, 'CALISAN_LISTELE_HATA');
  }
});

app.post('/api/calisan-ekle', async (req, res) => {
  const { ad, soyad, telefon, personel_tipi_id, ise_baslama_tarihi } = req.body;
  const mevcutKullaniciId = req.user?.id || req.session?.userId || 1;
  
  try {
    const pool = await getPool();
    
    // Duplicate Check
    const dupCheck = await pool.request()
      .input('telefon', sql.VarChar(11), telefon)
      .query('SELECT TOP 1 id FROM calisanlar WHERE telefon = @telefon');
    if (dupCheck.recordset.length > 0) {
      throw new Error('Record already exists. (Bu telefon numarasıyla kayıtlı çalışan zaten var.)');
    }

    const result = await pool.request()
      .input('ad', sql.NVarChar(50), ad)
      .input('soyad', sql.NVarChar(50), soyad)
      .input('telefon', sql.VarChar(11), telefon)
      .input('personel_tipi_id', sql.Int, Number(personel_tipi_id))
      .input('ise_baslama_tarihi', sql.Date, ise_baslama_tarihi)
      .query(`
        DECLARE @InsertedIds TABLE (id INT);

        INSERT INTO calisanlar (ad, soyad, telefon, personel_tipi_id, ise_baslama_tarihi)
        OUTPUT inserted.id INTO @InsertedIds
        VALUES (@ad, @soyad, @telefon, @personel_tipi_id, @ise_baslama_tarihi);

        SELECT id FROM @InsertedIds;
      `);
    const calisan_id = result.recordset[0].id;

    await writeLog(pool, mevcutKullaniciId, 'ÇALISAN_EKLE', `Yeni çalışan eklendi: ${ad} ${soyad} (ID: ${calisan_id})`);

    res.status(201).json({
      success: true,
      message: 'Çalışan başarıyla eklendi.',
      id: calisan_id
    });
  } catch (error) {
    await handleError(req, res, error, 'CALISAN_EKLE_HATA');
  }
});

app.get('/api/ilanlar', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        i.id,
        i.baslik,
        i.fiyat,
        i.il,
        i.ilce,
        i.metrekare,
        it.tip_adi AS ilan_tipi,
        ed.durum_adi AS ilan_durumu,
        m.ad + ' ' + m.soyad AS musteri,
        c.ad + ' ' + c.soyad AS calisan
      FROM ilanlar i
      INNER JOIN ilan_tipleri it ON it.id = i.ilan_tipi_id
      INNER JOIN ilan_durumlari ed ON ed.id = i.ilan_durumu_id
      INNER JOIN musteriler m ON m.id = i.musteri_id
      INNER JOIN calisanlar c ON c.id = i.calisan_id
      ORDER BY i.id DESC;
    `);
    res.json(result.recordset);
  } catch (error) {
    await handleError(req, res, error, 'ILAN_LISTELE_HATA');
  }
});

app.post('/api/ilan-ekle', async (req, res) => {
  const body = req.body;
  const mevcutKullaniciId = req.user?.id || req.session?.userId || 1;

  try {
    const pool = await getPool();
    
    // Duplicate Check
    const dupCheck = await pool.request()
      .input('baslik', sql.NVarChar(100), body.baslik)
      .query('SELECT TOP 1 id FROM ilanlar WHERE baslik = @baslik');
    if (dupCheck.recordset.length > 0) {
      throw new Error('Record already exists. (Bu başlıkla kayıtlı ilan zaten var.)');
    }

    const request = pool.request()
      .input('Baslik', sql.NVarChar(100), body.baslik)
      .input('Fiyat', sql.Int, Number(body.fiyat))
      .input('EmlakTipiId', sql.Int, Number(body.emlak_tipi_id))
      .input('OdaTipiId', sql.Int, Number(body.oda_tipi_id))
      .input('IsitmaTipiId', sql.Int, Number(body.isitma_tipi_id))
      .input('MusteriId', sql.Int, Number(body.musteri_id))
      .input('CalisanId', sql.Int, Number(body.calisan_id))
      .input('IlanTipiId', sql.Int, Number(body.ilan_tipi_id))
      .input('Il', sql.NVarChar(50), body.il)
      .input('Ilce', sql.NVarChar(50), body.ilce)
      .input('YapimYili', sql.Int, Number(body.yapim_yili))
      .input('Metrekare', sql.Int, Number(body.metrekare))
      .input('Mahalle', sql.NVarChar(100), body.mahalle || null)
      .input('Adres', sql.NVarChar(255), body.adres || null)
      .input('BulunduguKat', sql.Int, body.bulundugu_kat ? Number(body.bulundugu_kat) : null)
      .input('ToplamKat', sql.Int, body.toplam_kat ? Number(body.toplam_kat) : null)
      .input('BalkonSayisi', sql.Int, body.balkon_sayisi ? Number(body.balkon_sayisi) : null)
      .input('WcSayisi', sql.Int, body.wc_sayisi ? Number(body.wc_sayisi) : null)
      .input('EsyaliMi', sql.Bit, Boolean(body.esyali_mi))
      .input('AidatTutari', sql.Int, body.aidat_tutari ? Number(body.aidat_tutari) : null)
      .input('DepozitoTutari', sql.Int, body.depozito_tutari ? Number(body.depozito_tutari) : null)
      .input('TapuDurumuId', sql.Int, body.tapu_durumu_id ? Number(body.tapu_durumu_id) : null)
      .input('KrediyeUygunMu', sql.Bit, Boolean(body.krediye_uygun_mu));

    await request.execute('sp_ArayuzdenIlanKaydet');
    
    // İlan ekleme başarılı logu
    await writeLog(pool, mevcutKullaniciId, 'ILAN_EKLE', `Yeni ilan eklendi: ${body.baslik}`);
    
    res.status(201).json({
      success: true,
      message: 'İlan başarıyla eklendi.'
    });
  } catch (error) {
    await handleError(req, res, error, 'ILAN_EKLE_HATA');
  }
});

app.get('/api/sale-properties', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM vw_satilik_ilanlar ORDER BY [İlan No] DESC;');
    res.json(result.recordset || []);
  } catch (error) {
    await handleError(req, res, error, 'SALE_PROPERTIES_HATA');
  }
});

app.get('/api/rental-properties', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM vw_kiralik_ilanlar ORDER BY [İlan No] DESC;');
    res.json(result.recordset || []);
  } catch (error) {
    await handleError(req, res, error, 'RENTAL_PROPERTIES_HATA');
  }
});

app.get('/api/komisyon-ozeti', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM vw_personel_komisyon_ozeti;');
    res.json(result.recordset);
  } catch (error) {
    await handleError(req, res, error, 'KOMISYON_OZETI_HATA');
  }
});

// GET sales history
app.get('/api/sales-history', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        s.id,
        i.id AS [İlan No],
        i.baslik AS [Başlık],
        FORMAT(s.satis_tarihi, 'dd.MM.yyyy', 'tr-TR') AS [Satış Tarihi],
        s.satis_tutari AS [Satış Tutarı],
        s.kazanc_tutari AS [Kazanılan Komisyon],
        m_alici.ad + ' ' + m_alici.soyad AS [Alıcı],
        m_satici.ad + ' ' + m_satici.soyad AS [Satıcı],
        c.ad + ' ' + c.soyad AS [Personel]
      FROM satislar s
      INNER JOIN ilanlar i ON i.id = s.ilan_id
      INNER JOIN musteriler m_alici ON m_alici.id = s.alici_id
      INNER JOIN musteriler m_satici ON m_satici.id = s.satici_id
      INNER JOIN calisanlar c ON c.id = s.personel_id
      ORDER BY s.id DESC;
    `);
    res.json(result.recordset || []);
  } catch (error) {
    await handleError(req, res, error, 'SALES_HISTORY_HATA');
  }
});

// GET rental contracts
app.get('/api/rental-contracts', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        k.id,
        i.id AS [İlan No],
        i.baslik AS [Başlık],
        FORMAT(k.sozlesme_baslangic_tarihi, 'dd.MM.yyyy', 'tr-TR') AS [Başlangıç Tarihi],
        k.sozlesme_suresi_ay AS [Süre (Ay)],
        FORMAT(k.sozlesme_bitis_tarihi, 'dd.MM.yyyy', 'tr-TR') AS [Bitiş Tarihi],
        k.aylik_kira_tutari AS [Kira Tutarı],
        m_kiraci.ad + ' ' + m_kiraci.soyad AS [Kiracı],
        m_veren.ad + ' ' + m_veren.soyad AS [Kiraya Veren],
        c.ad + ' ' + c.soyad AS [Personel]
      FROM kira_sozlesmeleri k
      INNER JOIN ilanlar i ON i.id = k.ilan_id
      INNER JOIN musteriler m_kiraci ON m_kiraci.id = k.kiraci_id
      INNER JOIN musteriler m_veren ON m_veren.id = k.kiraya_veren_id
      INNER JOIN calisanlar c ON c.id = k.calisan_id
      ORDER BY k.id DESC;
    `);
    res.json(result.recordset || []);
  } catch (error) {
    await handleError(req, res, error, 'RENTAL_CONTRACTS_HATA');
  }
});

// GET specific ilan details
app.get('/api/ilanlar/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          i.*,
          ki.esyali_mi, ki.aidat_tutari, ki.depozito_tutari,
          si.tapu_durumu_id, si.krediye_uygun_mu
        FROM ilanlar i
        LEFT JOIN kiralik_ilanlar ki ON ki.ilan_id = i.id
        LEFT JOIN satilik_ilanlar si ON si.ilan_id = i.id
        WHERE i.id = @id;
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'İlan bulunamadı.' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    await handleError(req, res, error, 'ILAN_DETAY_HATA');
  }
});

// PUT edit listing details
app.put('/api/ilan-duzenle/:id', async (req, res) => {
  const ilanId = Number(req.params.id);
  const body = req.body;
  const mevcutKullaniciId = req.user?.id || req.session?.userId || 1;

  try {
    const pool = await getPool();

    // Check if listing exists
    const checkRes = await pool.request()
      .input('id', sql.Int, ilanId)
      .query(`
        SELECT i.id, i.ilan_tipi_id, it.tip_adi AS ilan_tipi
        FROM ilanlar i
        INNER JOIN ilan_tipleri it ON it.id = i.ilan_tipi_id
        WHERE i.id = @id
      `);

    if (checkRes.recordset.length === 0) {
      throw new Error('İlan bulunamadı.');
    }

    const listing = checkRes.recordset[0];

    // Customer Role Validation during edit
    const customerTypesResult = await pool.request()
      .input('musteriId', sql.Int, Number(body.musteri_id))
      .query('SELECT musteri_tipi_id FROM musteri_tipi_atamalari WHERE musteri_id = @musteriId');
    
    const customerTypes = customerTypesResult.recordset.map(r => r.musteri_tipi_id);
    
    const isSatilik = Number(listing.ilan_tipi_id) === 2;
    const isKiralik = Number(listing.ilan_tipi_id) === 1;

    if (isSatilik && !customerTypes.includes(2)) {
      throw new Error('Seçilen ilan sahibi "Satıcı" rolüne sahip olmalıdır.');
    }
    if (isKiralik && !customerTypes.includes(4)) {
      throw new Error('Seçilen ilan sahibi "Kiraya Veren" rolüne sahip olmalıdır.');
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update main ilanlar table
      await new sql.Request(transaction)
        .input('id', sql.Int, ilanId)
        .input('baslik', sql.NVarChar(100), body.baslik)
        .input('fiyat', sql.Int, Number(body.fiyat))
        .input('emlak_tipi_id', sql.Int, Number(body.emlak_tipi_id))
        .input('oda_tipi_id', sql.Int, Number(body.oda_tipi_id))
        .input('isitma_tipi_id', sql.Int, Number(body.isitma_tipi_id))
        .input('musteri_id', sql.Int, Number(body.musteri_id))
        .input('calisan_id', sql.Int, Number(body.calisan_id))
        .input('il', sql.NVarChar(50), body.il)
        .input('ilce', sql.NVarChar(50), body.ilce)
        .input('mahalle', sql.NVarChar(100), body.mahalle || null)
        .input('adres', sql.NVarChar(255), body.adres || null)
        .input('yapim_yili', sql.Int, Number(body.yapim_yili))
        .input('metrekare', sql.Int, Number(body.metrekare))
        .input('bulundugu_kat', sql.Int, body.bulundugu_kat ? Number(body.bulundugu_kat) : null)
        .input('toplam_kat', sql.Int, body.toplam_kat ? Number(body.toplam_kat) : null)
        .input('balkon_sayisi', sql.Int, body.balkon_sayisi ? Number(body.balkon_sayisi) : null)
        .input('wc_sayisi', sql.Int, body.wc_sayisi ? Number(body.wc_sayisi) : null)
        .query(`
          UPDATE ilanlar
          SET
            baslik = @baslik,
            fiyat = @fiyat,
            emlak_tipi_id = @emlak_tipi_id,
            oda_tipi_id = @oda_tipi_id,
            isitma_tipi_id = @isitma_tipi_id,
            musteri_id = @musteri_id,
            calisan_id = @calisan_id,
            il = @il,
            ilce = @ilce,
            mahalle = @mahalle,
            adres = @adres,
            yapim_yili = @yapim_yili,
            metrekare = @metrekare,
            bulundugu_kat = @bulundugu_kat,
            toplam_kat = @toplam_kat,
            balkon_sayisi = @balkon_sayisi,
            wc_sayisi = @wc_sayisi
          WHERE id = @id;
        `);

      if (isKiralik) {
        // Update kiralik_ilanlar table
        await new sql.Request(transaction)
          .input('ilan_id', sql.Int, ilanId)
          .input('esyali_mi', sql.Bit, Boolean(body.esyali_mi))
          .input('aidat_tutari', sql.Int, body.aidat_tutari ? Number(body.aidat_tutari) : null)
          .input('depozito_tutari', sql.Int, body.depozito_tutari ? Number(body.depozito_tutari) : null)
          .query(`
            UPDATE kiralik_ilanlar
            SET
              esyali_mi = @esyali_mi,
              aidat_tutari = @aidat_tutari,
              depozito_tutari = @depozito_tutari
            WHERE ilan_id = @ilan_id;
          `);
      } else if (isSatilik) {
        // Update satilik_ilanlar table
        await new sql.Request(transaction)
          .input('ilan_id', sql.Int, ilanId)
          .input('tapu_durumu_id', sql.Int, body.tapu_durumu_id ? Number(body.tapu_durumu_id) : null)
          .input('krediye_uygun_mu', sql.Bit, Boolean(body.krediye_uygun_mu))
          .query(`
            UPDATE satilik_ilanlar
            SET
              tapu_durumu_id = @tapu_durumu_id,
              krediye_uygun_mu = @krediye_uygun_mu
            WHERE ilan_id = @ilan_id;
          `);
      }

      await transaction.commit();

      await writeLog(pool, mevcutKullaniciId, 'ILAN_GUNCELLE', `İlan güncellendi: "${body.baslik}" (ID: ${ilanId})`);

      res.json({
        success: true,
        message: 'İlan başarıyla güncellendi.'
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    await handleError(req, res, error, 'ILAN_GUNCELLE_HATA');
  }
});

// POST mark property as sold
app.post('/api/sale-properties/:id/sold', async (req, res) => {
  const ilanId = Number(req.params.id);
  const { alici_id, personel_id, komisyon_tutari } = req.body;
  const mevcutKullaniciId = req.user?.id || req.session?.userId || 1;

  try {
    const pool = await getPool();

    // 1. Fetch listing details to validate and get seller and price
    const listingRes = await pool.request()
      .input('id', sql.Int, ilanId)
      .query(`
        SELECT i.id, i.fiyat, i.musteri_id, i.ilan_durumu_id, it.tip_adi AS ilan_tipi
        FROM ilanlar i
        INNER JOIN ilan_tipleri it ON it.id = i.ilan_tipi_id
        WHERE i.id = @id
      `);

    if (listingRes.recordset.length === 0) {
      throw new Error('İlan bulunamadı.');
    }

    const listing = listingRes.recordset[0];

    if (listing.ilan_tipi !== 'Satılık') {
      throw new Error('Bu ilan satılık bir ilan değildir.');
    }

    if (listing.ilan_durumu_id !== 1) { // 1 = Aktif
      throw new Error('Bu ilan aktif değildir veya zaten satılmış/kiralanmıştır.');
    }

    // 2. Validate buyer exists and has Buyer (Alıcı) role
    const buyerRolesRes = await pool.request()
      .input('buyerId', sql.Int, Number(alici_id))
      .query(`
        SELECT 1 
        FROM musteri_tipi_atamalari mta
        INNER JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
        WHERE mta.musteri_id = @buyerId AND mt.tip_adi = N'Alıcı'
      `);
    if (buyerRolesRes.recordset.length === 0) {
      throw new Error('Seçilen alıcı "Alıcı" rolüne sahip olmalıdır.');
    }

    // 3. Validate employee exists
    const employeeRes = await pool.request()
      .input('employeeId', sql.Int, Number(personel_id))
      .query('SELECT 1 FROM calisanlar WHERE id = @employeeId');
    if (employeeRes.recordset.length === 0) {
      throw new Error('Seçilen çalışan bulunamadı.');
    }

    // 4. Validate commission amount
    const commAmount = Number(komisyon_tutari);
    if (isNaN(commAmount) || commAmount <= 0) {
      throw new Error('Komisyon tutarı sıfırdan büyük olmalıdır.');
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create the sales record
      const salesRes = await new sql.Request(transaction)
        .input('ilan_id', sql.Int, ilanId)
        .input('alici_id', sql.Int, Number(alici_id))
        .input('satici_id', sql.Int, listing.musteri_id)
        .input('personel_id', sql.Int, Number(personel_id))
        .input('satis_tarihi', sql.Date, new Date())
        .input('satis_tutari', sql.Int, listing.fiyat)
        .input('kazanc_tutari', sql.Int, commAmount)
        .query(`
          DECLARE @InsertedIds TABLE (id INT);

          INSERT INTO satislar (ilan_id, alici_id, satici_id, personel_id, satis_tarihi, satis_tutari, kazanc_tutari)
          OUTPUT inserted.id INTO @InsertedIds
          VALUES (@ilan_id, @alici_id, @satici_id, @personel_id, @satis_tarihi, @satis_tutari, @kazanc_tutari);

          SELECT id FROM @InsertedIds;
        `);

      const satisId = salesRes.recordset[0].id;

      // Create the commission record
      await new sql.Request(transaction)
        .input('personel_id', sql.Int, Number(personel_id))
        .input('satis_id', sql.Int, satisId)
        .input('komisyon_tutari', sql.Int, commAmount)
        .query(`
          INSERT INTO komisyonlar (personel_id, satis_id, komisyon_tutari)
          VALUES (@personel_id, @satis_id, @komisyon_tutari);
        `);

      await transaction.commit();

      // Log only once on success
      await writeLog(pool, mevcutKullaniciId, 'ILAN_SATILDI', `İlan No ${ilanId} başarıyla satıldı. Satış ID: ${satisId}, Komisyon: ${commAmount} TL.`);

      res.json({
        success: true,
        message: 'Mülk satışı ve komisyon kaydı başarıyla oluşturuldu.'
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    await handleError(req, res, error, 'ILAN_SATIS_HATA');
  }
});

// POST mark property as rented
app.post('/api/rental-properties/:id/rented', async (req, res) => {
  const ilanId = Number(req.params.id);
  const { kiraci_id, personel_id, komisyon_tutari } = req.body;
  const mevcutKullaniciId = req.user?.id || req.session?.userId || 1;

  try {
    const pool = await getPool();

    // 1. Fetch listing details to validate and get landlord and price
    const listingRes = await pool.request()
      .input('id', sql.Int, ilanId)
      .query(`
        SELECT i.id, i.fiyat, i.musteri_id, i.ilan_durumu_id, it.tip_adi AS ilan_tipi
        FROM ilanlar i
        INNER JOIN ilan_tipleri it ON it.id = i.ilan_tipi_id
        WHERE i.id = @id
      `);

    if (listingRes.recordset.length === 0) {
      throw new Error('İlan bulunamadı.');
    }

    const listing = listingRes.recordset[0];

    if (listing.ilan_tipi !== 'Kiralık') {
      throw new Error('Bu ilan kiralık bir ilan değildir.');
    }

    if (listing.ilan_durumu_id !== 1) { // 1 = Aktif
      throw new Error('Bu ilan aktif değildir veya zaten satılmış/kiralanmıştır.');
    }

    // 2. Validate tenant exists and has Kiracı role
    const tenantRolesRes = await pool.request()
      .input('tenantId', sql.Int, Number(kiraci_id))
      .query(`
        SELECT 1 
        FROM musteri_tipi_atamalari mta
        INNER JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
        WHERE mta.musteri_id = @tenantId AND mt.tip_adi = N'Kiracı'
      `);
    if (tenantRolesRes.recordset.length === 0) {
      throw new Error('Seçilen kiracı "Kiracı" rolüne sahip olmalıdır.');
    }

    // 3. Validate employee exists
    const employeeRes = await pool.request()
      .input('employeeId', sql.Int, Number(personel_id))
      .query('SELECT 1 FROM calisanlar WHERE id = @employeeId');
    if (employeeRes.recordset.length === 0) {
      throw new Error('Seçilen çalışan bulunamadı.');
    }

    // 4. Validate commission amount
    const commAmount = Number(komisyon_tutari);
    if (isNaN(commAmount) || commAmount <= 0) {
      throw new Error('Komisyon tutarı sıfırdan büyük olmalıdır.');
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Create the rental contract record
      const rentalRes = await new sql.Request(transaction)
        .input('ilan_id', sql.Int, ilanId)
        .input('kiraci_id', sql.Int, Number(kiraci_id))
        .input('kiraya_veren_id', sql.Int, listing.musteri_id)
        .input('calisan_id', sql.Int, Number(personel_id))
        .input('sozlesme_baslangic_tarihi', sql.Date, new Date())
        .input('sozlesme_suresi_ay', sql.Int, 12)
        .input('aylik_kira_tutari', sql.Int, listing.fiyat)
        .query(`
          DECLARE @InsertedIds TABLE (id INT);

          INSERT INTO kira_sozlesmeleri (ilan_id, kiraci_id, kiraya_veren_id, calisan_id, sozlesme_baslangic_tarihi, sozlesme_suresi_ay, aylik_kira_tutari)
          OUTPUT inserted.id INTO @InsertedIds
          VALUES (@ilan_id, @kiraci_id, @kiraya_veren_id, @calisan_id, @sozlesme_baslangic_tarihi, @sozlesme_suresi_ay, @aylik_kira_tutari);

          SELECT id FROM @InsertedIds;
        `);

      const rentalId = rentalRes.recordset[0].id;

      // Create the commission record
      await new sql.Request(transaction)
        .input('personel_id', sql.Int, Number(personel_id))
        .input('kira_sozlesmesi_id', sql.Int, rentalId)
        .input('komisyon_tutari', sql.Int, commAmount)
        .query(`
          INSERT INTO komisyonlar (personel_id, kira_sozlesmesi_id, komisyon_tutari)
          VALUES (@personel_id, @kira_sozlesmesi_id, @komisyon_tutari);
        `);

      await transaction.commit();

      // Log only once on success
      await writeLog(pool, mevcutKullaniciId, 'ILAN_KIRALANDI', `İlan No ${ilanId} başarıyla kiralandı. Sözleşme ID: ${rentalId}, Komisyon: ${commAmount} TL.`);

      res.json({
        success: true,
        message: 'Mülk kiralaması ve komisyon kaydı başarıyla oluşturuldu.'
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    await handleError(req, res, error, 'ILAN_KIRALAMA_HATA');
  }
});

// DELETE delete an ilan permanently
app.delete('/api/ilan-sil/:id', async (req, res) => {
  const ilanId = Number(req.params.id);
  const mevcutKullaniciId = req.user?.id || req.session?.userId || 1;

  try {
    const pool = await getPool();

    // Check if ilan exists
    const checkRes = await pool.request()
      .input('id', sql.Int, ilanId)
      .query('SELECT baslik FROM ilanlar WHERE id = @id');

    if (checkRes.recordset.length === 0) {
      throw new Error('İlan bulunamadı.');
    }

    const baslik = checkRes.recordset[0].baslik;

    await pool.request()
      .input('id', sql.Int, ilanId)
      .query('DELETE FROM ilanlar WHERE id = @id');

    await writeLog(pool, mevcutKullaniciId, 'ILAN_SIL', `İlan silindi: "${baslik}" (ID: ${ilanId})`);

    res.json({
      success: true,
      message: 'İlan başarıyla kaldırıldı.'
    });
  } catch (error) {
    let errorMsg = error.message;
    if (errorMsg.includes('REFERENCE constraint')) {
      errorMsg = 'Bu ilan kaldırılamaz çünkü ilişkili satış veya kiralama sözleşmesi bulunuyor.';
    }
    await handleError(req, res, new Error(errorMsg), 'ILAN_SIL_HATA');
  }
});

// DELETE delete an employee permanently
app.delete('/api/calisan-sil/:id', async (req, res) => {
  const calisanId = Number(req.params.id);
  const mevcutKullaniciId = req.user?.id || req.session?.userId || 1;

  try {
    const pool = await getPool();

    // Check if calisan exists
    const checkRes = await pool.request()
      .input('id', sql.Int, calisanId)
      .query('SELECT ad, soyad FROM calisanlar WHERE id = @id');

    if (checkRes.recordset.length === 0) {
      throw new Error('Çalışan bulunamadı.');
    }

    const name = `${checkRes.recordset[0].ad} ${checkRes.recordset[0].soyad}`;

    await pool.request()
      .input('id', sql.Int, calisanId)
      .query('DELETE FROM calisanlar WHERE id = @id');

    await writeLog(pool, mevcutKullaniciId, 'ÇALISAN_SIL', `Çalışan silindi: "${name}" (ID: ${calisanId})`);

    res.json({
      success: true,
      message: 'Çalışan başarıyla silindi.'
    });
  } catch (error) {
    let errorMsg = error.message;
    if (errorMsg.includes('REFERENCE constraint')) {
      errorMsg = 'Bu çalışan silinemez çünkü ilişkili ilanlar veya komisyonlar mevcuttur.';
    }
    await handleError(req, res, new Error(errorMsg), 'CALISAN_SIL_HATA');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucu Başlatma Bloğu
try {
  app.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`👉 Linke tıkla: http://localhost:${port}`);
    console.log(`==================================================\n`);
  });
} catch (globalError) {
  console.log(`\n\x1b[31m[KRİTİK HATA] Sunucu ayağa kalkarken patladı:\x1b[0m`);
  console.error(globalError);
}
