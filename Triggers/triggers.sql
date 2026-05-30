CREATE TRIGGER trg_UPDATE_ILAN_DURUMU
ON satislar
AFTER INSERT
AS 
BEGIN

    SET NOCOUNT ON;

    UPDATE ilanlar
    SET ilanlar.ilan_durumu_id = 4
    FROM ilanlar i
    INNER JOIN inserted ins ON i.id = ins.ilan_id;
    -- inserted adında sanal tablo oluşturduk. Bu tablo ilanlardaki ve kira_sozlesmelerindeki aynı işi gören sütunların
    -- eşleşmesini kontrol edip uygun olanları  INNER JOIN ile tutuyor. 
    -- Eğer eşleştiyse ilan_durumu_id'si 4 ('Satıldı') olarak güncelleniyor. Bu da o ilanın artık kiralandığını gösteriyor.
END;
GO

CREATE TRIGGER trg_UPDATE_ILAN_DURUMU
ON kira_sozlesmleri
AFTER INSERT
AS 
BEGIN

    SET NOCOUNT ON;

    UPDATE ilanlar -- tabloya yapılacak işlemi belirledim.
    SET ilanlar.ilan_durumu_id = 3 -- sütunun değerini güncelledim.
    FROM ilanlar i -- tabloya bir takma ad verdim
    INNER JOIN inserted ins ON i.id = ins.ilan_id; 
    -- inserted adında sanal tablo oluşturduk. Bu tablo ilanlardaki ve kira_sozlesmelerindeki aynı işi gören sütunların
    -- eşleşmesini kontrol edip uygun olanları  INNER JOIN ile tutuyor. 
    -- Eğer eşleştiyse ilan_durumu_id'si 3 ('Kiralandı') olarak güncelleniyor. Bu da o ilanın artık kiralandığını gösteriyor.

END;
GO

