CREATE VIEW vw_kiralik_ilanlar
AS
SELECT
    ilanlar.id AS [İlan No],
    ilanlar.baslik AS [Başlık],
    ilanlar.fiyat AS [Fiyat],

    ilanlar.il AS [İl],
    ilanlar.ilce AS [İlçe],
    ilanlar.mahalle AS [Mahalle],
    ilanlar.adres AS [Adres],
    ilanlar.yapim_yili AS [Yapım Yılı],

    ilanlar.metrekare AS [Metrekare],
    YEAR(GETDATE()) - ilanlar.yapim_yili AS [Bina Yaşı],
    ilanlar.bulundugu_kat AS [Bulunduğu Kat],
    ilanlar.toplam_kat AS [Toplam Kat],
    ilanlar.balkon_sayisi AS [Balkon Sayısı],
    ilanlar.wc_sayisi AS [WC Sayısı],

    emlak_tipleri.tip_adi AS [Emlak Tipi],
    oda_tipleri.tip_adi AS [Oda Tipi],
    isitma_tipleri.tip_adi AS [Isıtma Tipi],
    ilan_durumlari.durum_adi AS [İlan Durumu],

    CASE
        WHEN kiralik_ilanlar.esyali_mi = 1 THEN 'Evet'
        ELSE 'Hayır'
    END AS [Eşyalı Mı],

    kiralik_ilanlar.aidat_tutari AS [Aidat Tutarı],
    kiralik_ilanlar.depozito_tutari AS [Depozito Tutarı],

    calisanlar.ad + ' ' + calisanlar.soyad AS [İlanı Ekleyen],
    personel_tipleri.tip_adi AS [Ekleyen Kişinin Rolü],

    FORMAT(
        ilanlar.olusturulma_tarihi,
        'dd.MM.yyyy HH:mm',
        'tr-TR'
    ) AS [Eklenme Tarihi],

    FORMAT(
        ilanlar.guncellenme_tarihi,
        'dd.MM.yyyy HH:mm',
        'tr-TR'
    ) AS [Güncellenme Tarihi]
    
FROM ilanlar
INNER JOIN kiralik_ilanlar
    ON ilanlar.id = kiralik_ilanlar.ilan_id
INNER JOIN emlak_tipleri
    ON ilanlar.emlak_tipi_id = emlak_tipleri.id
INNER JOIN oda_tipleri
    ON ilanlar.oda_tipi_id = oda_tipleri.id
INNER JOIN isitma_tipleri
    ON ilanlar.isitma_tipi_id = isitma_tipleri.id
INNER JOIN ilan_durumlari
    ON ilanlar.ilan_durumu_id = ilan_durumlari.id
INNER JOIN calisanlar
    ON ilanlar.calisan_id = calisanlar.id
INNER JOIN personel_tipleri
    ON calisanlar.personel_tipi_id = personel_tipleri.id
WHERE ilan_durumlari.durum_adi = N'Aktif';
GO
