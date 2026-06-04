CREATE TRIGGER trg_UPDATE_ILAN_DURUMU_SATIS
ON satislar
AFTER INSERT
AS 
BEGIN

    SET NOCOUNT ON;
    IF (TRIGGER_NESTLEVEL() > 1) RETURN;

    UPDATE i
    SET i.ilan_durumu_id = d.id
    FROM ilanlar i
    INNER JOIN inserted ins ON i.id = ins.ilan_id
    INNER JOIN ilan_durumlari d ON d.durum_adi = N'Satıldı'
    WHERE i.ilan_durumu_id <> d.id;
    -- inserted adında sanal tablo oluşturduk. Bu tablo ilanlardaki ve kira_sozlesmelerindeki aynı işi gören sütunların
    -- eşleşmesini kontrol edip uygun olanları  INNER JOIN ile tutuyor. 
    -- Eğer eşleştiyse ilan_durumu_id'si 4 ('Satıldı') olarak güncelleniyor. Bu da o ilanın artık satıldığını gösteriyor.
END;
GO
