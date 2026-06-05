CREATE TRIGGER trg_KIRA_GUNCELLEME_TARIHI
ON kira_sozlesmeleri
AFTER UPDATE
AS 
BEGIN

    SET NOCOUNT ON;

    IF (TRIGGER_NESTLEVEL(OBJECT_ID('trg_KIRA_GUNCELLEME_TARIHI'), 'AFTER', 'DML') > 1) RETURN;

    UPDATE k
    SET k.guncellenme_tarihi = GETDATE()
    FROM kira_sozlesmeleri k
    INNER JOIN inserted ins ON k.id = ins.id;
    

END;
GO
