CREATE TRIGGER trg_SATIS_MUSTERI_TIPI_KONTROL
ON satislar
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        WHERE NOT EXISTS (
            SELECT 1
            FROM musteri_tipi_atamalari mta
            INNER JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
            WHERE mta.musteri_id = ins.alici_id
              AND mt.tip_adi = N'Alıcı'
        )
    )
    BEGIN
        ;THROW 50201, 'Satis alicisi Alici musteri tipine sahip olmalidir.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        WHERE NOT EXISTS (
            SELECT 1
            FROM musteri_tipi_atamalari mta
            INNER JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
            WHERE mta.musteri_id = ins.satici_id
              AND mt.tip_adi = N'Satıcı'
        )
    )
    BEGIN
        ;THROW 50202, 'Satis saticisi Satici musteri tipine sahip olmalidir.', 1;
    END;
END;
GO

CREATE TRIGGER trg_KIRA_MUSTERI_TIPI_KONTROL
ON kira_sozlesmeleri
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        WHERE NOT EXISTS (
            SELECT 1
            FROM musteri_tipi_atamalari mta
            INNER JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
            WHERE mta.musteri_id = ins.kiraci_id
              AND mt.tip_adi = N'Kiracı'
        )
    )
    BEGIN
        ;THROW 50203, 'Kira sozlesmesi kiracisi Kiraci musteri tipine sahip olmalidir.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        WHERE NOT EXISTS (
            SELECT 1
            FROM musteri_tipi_atamalari mta
            INNER JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
            WHERE mta.musteri_id = ins.kiraya_veren_id
              AND mt.tip_adi = N'Kiraya Veren'
        )
    )
    BEGIN
        ;THROW 50204, 'Kira sozlesmesi kiraya vereni Kiraya Veren musteri tipine sahip olmalidir.', 1;
    END;
END;
GO
