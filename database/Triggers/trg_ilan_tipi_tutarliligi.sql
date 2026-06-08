CREATE TRIGGER trg_KIRALIK_ILAN_TIPI_KONTROL
ON kiralik_ilanlar
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        INNER JOIN ilanlar i ON i.id = ins.ilan_id
        INNER JOIN ilan_tipleri it ON it.id = i.ilan_tipi_id
        WHERE it.tip_adi <> N'Kiralık'
    )
    BEGIN
        ;THROW 50101, 'Kiralik ilanlar tablosuna sadece Kiralik tipindeki ilanlar eklenebilir.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        INNER JOIN satilik_ilanlar s ON s.ilan_id = ins.ilan_id
    )
    BEGIN
        ;THROW 50102, 'Bir ilan ayni anda hem Kiralik hem Satilik olamaz.', 1;
    END;
END;
GO

CREATE TRIGGER trg_SATILIK_ILAN_TIPI_KONTROL
ON satilik_ilanlar
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        INNER JOIN ilanlar i ON i.id = ins.ilan_id
        INNER JOIN ilan_tipleri it ON it.id = i.ilan_tipi_id
        WHERE it.tip_adi <> N'Satılık'
    )
    BEGIN
        ;THROW 50103, 'Satilik ilanlar tablosuna sadece Satilik tipindeki ilanlar eklenebilir.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        INNER JOIN kiralik_ilanlar k ON k.ilan_id = ins.ilan_id
    )
    BEGIN
        ;THROW 50104, 'Bir ilan ayni anda hem Satilik hem Kiralik olamaz.', 1;
    END;
END;
GO

CREATE TRIGGER trg_SATIS_ILAN_TIPI_KONTROL
ON satislar
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        INNER JOIN ilanlar i ON i.id = ins.ilan_id
        INNER JOIN ilan_tipleri it ON it.id = i.ilan_tipi_id
        LEFT JOIN satilik_ilanlar s ON s.ilan_id = i.id
        WHERE it.tip_adi <> N'Satılık'
           OR s.ilan_id IS NULL
    )
    BEGIN
        ;THROW 50105, 'Satis kaydi sadece Satilik tipindeki ilan icin olusturulabilir.', 1;
    END;
END;
GO

CREATE TRIGGER trg_KIRA_ILAN_TIPI_KONTROL
ON kira_sozlesmeleri
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        INNER JOIN ilanlar i ON i.id = ins.ilan_id
        INNER JOIN ilan_tipleri it ON it.id = i.ilan_tipi_id
        LEFT JOIN kiralik_ilanlar k ON k.ilan_id = i.id
        WHERE it.tip_adi <> N'Kiralık'
           OR k.ilan_id IS NULL
    )
    BEGIN
        ;THROW 50106, 'Kira sozlesmesi sadece Kiralik tipindeki ilan icin olusturulabilir.', 1;
    END;
END;
GO
