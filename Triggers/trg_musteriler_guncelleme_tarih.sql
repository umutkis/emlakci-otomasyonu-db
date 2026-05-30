CREATE TRIGGER trg_MUSTERILER_GUNCELLEME_TARIHI
ON musteriler
AFTER UPDATE
AS 
BEGIN

    SET NOCOUNT ON;

    IF (TRIGGER_NESTLEVEL() > 1) RETURN;

    UPDATE m
    SET m.guncellenme_tarihi = GETDATE()
    FROM musteriler m
    INNER JOIN inserted ins ON m.id = ins.id;
    

END;
GO