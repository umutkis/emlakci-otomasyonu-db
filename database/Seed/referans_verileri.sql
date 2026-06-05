MERGE personel_tipleri AS target
USING (VALUES
    (N'Patron'),
    (N'Çalışan')
) AS source (tip_adi)
ON target.tip_adi = source.tip_adi
WHEN NOT MATCHED THEN
    INSERT (tip_adi) VALUES (source.tip_adi);

MERGE musteri_tipleri AS target
USING (VALUES
    (N'Alıcı'),
    (N'Satıcı'),
    (N'Kiracı'),
    (N'Kiraya Veren')
) AS source (tip_adi)
ON target.tip_adi = source.tip_adi
WHEN NOT MATCHED THEN
    INSERT (tip_adi) VALUES (source.tip_adi);

MERGE ilan_durumlari AS target
USING (VALUES
    (N'Aktif'),
    (N'Pasif'),
    (N'Kiralandı'),
    (N'Satıldı')
) AS source (durum_adi)
ON target.durum_adi = source.durum_adi
WHEN NOT MATCHED THEN
    INSERT (durum_adi) VALUES (source.durum_adi);

MERGE ilan_tipleri AS target
USING (VALUES
    (N'Kiralık'),
    (N'Satılık')
) AS source (tip_adi)
ON target.tip_adi = source.tip_adi
WHEN NOT MATCHED THEN
    INSERT (tip_adi) VALUES (source.tip_adi);

MERGE tapu_durumlari AS target
USING (VALUES
    (N'Kat Mülkiyetli'),
    (N'Kat İrtifaklı'),
    (N'Hisseli Tapu'),
    (N'Arsa Tapulu'),
    (N'Müstakil Tapulu')
) AS source (durum_adi)
ON target.durum_adi = source.durum_adi
WHEN NOT MATCHED THEN
    INSERT (durum_adi) VALUES (source.durum_adi);

MERGE emlak_tipleri AS target
USING (VALUES
    (N'Daire'),
    (N'Villa'),
    (N'Müstakil Ev'),
    (N'Arsa'),
    (N'Ofis'),
    (N'Dükkan')
) AS source (tip_adi)
ON target.tip_adi = source.tip_adi
WHEN NOT MATCHED THEN
    INSERT (tip_adi) VALUES (source.tip_adi);

MERGE isitma_tipleri AS target
USING (VALUES
    (N'Kombi'),
    (N'Merkezi'),
    (N'Soba'),
    (N'Klima'),
    (N'Yerden Isıtma'),
    (N'Doğalgaz Sobası'),
    (N'Kat Kaloriferi'),
    (N'Yok')
) AS source (tip_adi)
ON target.tip_adi = source.tip_adi
WHEN NOT MATCHED THEN
    INSERT (tip_adi) VALUES (source.tip_adi);

MERGE oda_tipleri AS target
USING (VALUES
    (N'1+0'),
    (N'1+1'),
    (N'1.5+1'),
    (N'2+0'),
    (N'2+1'),
    (N'2.5+1'),
    (N'3+1'),
    (N'3.5+1'),
    (N'4+1'),
    (N'4.5+1'),
    (N'5+1'),
    (N'5+2'),
    (N'6+1'),
    (N'6+2')
) AS source (tip_adi)
ON target.tip_adi = source.tip_adi
WHEN NOT MATCHED THEN
    INSERT (tip_adi) VALUES (source.tip_adi);
