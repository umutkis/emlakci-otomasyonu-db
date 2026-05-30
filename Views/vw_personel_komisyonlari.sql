CREATE VIEW vw_personel_komisyonlari
AS
SELECT
    calisanlar.ad + ' ' + calisanlar.soyad AS [Komisyonu Alan],

    CASE
        WHEN komisyonlar.kira_sozlesmesi_id IS NOT NULL THEN 'Kiralama'
        WHEN komisyonlar.satis_id IS NOT NULL THEN 'Satış'
    END AS [İşlem Türü],

    komisyonlar.komisyon_tutari AS [Komisyon Tutarı],

    FORMAT(
        komisyonlar.olusturulma_tarihi,
        'dd.MM.yyyy HH:mm',
        'tr-TR'
    ) AS [Eklenme Tarihi],

    FORMAT(
        komisyonlar.guncellenme_tarihi,
        'dd.MM.yyyy HH:mm',
        'tr-TR'
    ) AS [Güncellenme Tarihi]

FROM komisyonlar
INNER JOIN calisanlar
    ON komisyonlar.personel_id = calisanlar.id;