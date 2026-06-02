require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const port = Number(process.env.PORT || 3000);

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_DATABASE || 'emlakci_otomasyonu',
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

function handleError(res, error) {
  console.error(error);
  res.status(500).json({
    message: 'Islem tamamlanamadi.',
    detail: error.message
  });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS ok');
    res.json({ ok: result.recordset[0].ok === 1 });
  } catch (error) {
    handleError(res, error);
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
    handleError(res, error);
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
    handleError(res, error);
  }
});

app.post('/api/musteriler', async (req, res) => {
  const { ad, soyad, tc_kimlik_no, telefon, tip_ids = [] } = req.body;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const insert = await new sql.Request(transaction)
        .input('ad', sql.NVarChar(50), ad)
        .input('soyad', sql.NVarChar(50), soyad)
        .input('tc', sql.VarChar(11), tc_kimlik_no || null)
        .input('telefon', sql.VarChar(11), telefon)
        .query(`
          INSERT INTO musteriler (ad, soyad, tc_kimlik_no, telefon)
          OUTPUT inserted.id
          VALUES (@ad, @soyad, @tc, @telefon);
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
      res.status(201).json({ id: musteriId });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    handleError(res, error);
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
    handleError(res, error);
  }
});

app.post('/api/calisanlar', async (req, res) => {
  const { ad, soyad, telefon, personel_tipi_id, ise_baslama_tarihi } = req.body;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('ad', sql.NVarChar(50), ad)
      .input('soyad', sql.NVarChar(50), soyad)
      .input('telefon', sql.VarChar(11), telefon)
      .input('personel_tipi_id', sql.Int, Number(personel_tipi_id))
      .input('ise_baslama_tarihi', sql.Date, ise_baslama_tarihi)
      .query(`
        INSERT INTO calisanlar (ad, soyad, telefon, personel_tipi_id, ise_baslama_tarihi)
        OUTPUT inserted.id
        VALUES (@ad, @soyad, @telefon, @personel_tipi_id, @ise_baslama_tarihi);
      `);

    res.status(201).json({ id: result.recordset[0].id });
  } catch (error) {
    handleError(res, error);
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
    handleError(res, error);
  }
});

app.post('/api/ilanlar', async (req, res) => {
  const body = req.body;

  try {
    const pool = await getPool();
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
    res.status(201).json({ ok: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/komisyon-ozeti', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM vw_personel_komisyon_ozeti;');
    res.json(result.recordset);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Emlakci otomasyonu arayuzu: http://localhost:${port}`);
});
