CREATE TRIGGER trg_ILANLAR_GUNCELLEME_TARIHI
ON ilanlar
AFTER UPDATE
AS 
BEGIN

    SET NOCOUNT ON;

    IF (TRIGGER_NESTLEVEL(OBJECT_ID('trg_ILANLAR_GUNCELLEME_TARIHI'), 'AFTER', 'DML') > 1) RETURN;

    UPDATE i -- hedef tablo alias ile belirtildi
    SET i.guncellenme_tarihi = GETDATE()
    FROM ilanlar i
    INNER JOIN inserted ins ON i.id = ins.id;
    

END;
GO

CREATE TRIGGER trg_ILANLAR_IS_KURALI_KONTROL
ON ilanlar
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted
        WHERE yapim_yili > YEAR(GETDATE())
    )
    BEGIN
        THROW 50301, 'Yapim yili gelecek bir yil olamaz.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        INNER JOIN ilan_tipleri it ON it.id = ins.ilan_tipi_id
        WHERE it.tip_adi = N'Satılık'
          AND NOT EXISTS (
              SELECT 1
              FROM musteri_tipi_atamalari mta
              INNER JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
              WHERE mta.musteri_id = ins.musteri_id
                AND mt.tip_adi = N'Satıcı'
          )
    )
    BEGIN
        THROW 50302, 'Satilik ilan sahibi Satici musteri tipine sahip olmalidir.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM inserted ins
        INNER JOIN ilan_tipleri it ON it.id = ins.ilan_tipi_id
        WHERE it.tip_adi = N'Kiralık'
          AND NOT EXISTS (
              SELECT 1
              FROM musteri_tipi_atamalari mta
              INNER JOIN musteri_tipleri mt ON mt.id = mta.musteri_tipi_id
              WHERE mta.musteri_id = ins.musteri_id
                AND mt.tip_adi = N'Kiraya Veren'
          )
    )
    BEGIN
        THROW 50303, 'Kiralik ilan sahibi Kiraya Veren musteri tipine sahip olmalidir.', 1;
    END;
END;
GO
