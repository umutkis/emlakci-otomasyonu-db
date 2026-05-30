CREATE TRIGGER trg_CALISANLAR_GUNCELLEME_TARIHI
ON calisanlar
AFTER UPDATE
AS 
BEGIN

    SET NOCOUNT ON;

    IF (TRIGGER_NESTLEVEL() > 1) RETURN;

    UPDATE c
    SET c.guncellenme_tarihi = GETDATE()
    FROM calisanlar c
    INNER JOIN inserted ins ON c.id = ins.id;
    

END;
GO