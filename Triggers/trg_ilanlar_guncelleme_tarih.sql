CREATE TRIGGER trg_ILANLAR_GUNCELLEME_TARIHI
ON ilanlar
AFTER UPDATE
AS 
BEGIN

    SET NOCOUNT ON;

    IF (TRIGGER_NESTLEVEL() > 1) RETURN;

    UPDATE i -- hedef tablo alias ile belirtildi
    SET i.guncellenme_tarihi = GETDATE()
    FROM ilanlar i
    INNER JOIN inserted ins ON i.id = ins.id;
    

END;
GO

