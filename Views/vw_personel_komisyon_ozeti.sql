CREATE VIEW vw_personel_komisyon_ozeti
AS
SELECT
    calisanlar.ad + ' ' + calisanlar.soyad AS [Komisyonu Alan],

    SUM(
        CASE
            WHEN komisyonlar.kira_sozlesmesi_id IS NOT NULL
                THEN komisyonlar.komisyon_tutari
            ELSE 0
        END
    ) AS [Kiralama Komisyonu Toplamı],

    SUM(
        CASE
            WHEN komisyonlar.satis_id IS NOT NULL
                THEN komisyonlar.komisyon_tutari
            ELSE 0
        END
    ) AS [Satış Komisyonu Toplamı],

    SUM(komisyonlar.komisyon_tutari) AS [Toplam Komisyon]

FROM komisyonlar
INNER JOIN calisanlar
    ON komisyonlar.personel_id = calisanlar.id
GROUP BY
    calisanlar.id,
    calisanlar.ad,
    calisanlar.soyad;