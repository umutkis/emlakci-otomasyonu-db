CREATE PROCEDURE sp_ArayuzdenIlanKaydet
    -- 1. Ortak Alanlar (Arayüzdeki her ilanda olan inputlar)
    @Baslik VARCHAR(255),
    @Fiyat DECIMAL(18,2),
    @YapimYili INT,
    @IlanTipiId INT, -- 1: Kiralık, 2: Satılık

    -- 2. Özel Alanlar (Arayüzde tipe göre dinamik açılan inputlar)
    @EsyaliMi BIT = 0,
    @AidatTutari DECIMAL(10,2) = 0,
    @DepozitoTutari DECIMAL(10,2) = 0,
    @KrediUygunMu BIT = 1,
    @TapuHarciTutari DECIMAL(10,2) = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- ADIM A: Önce ortak verileri ana 'ilanlar' tablosuna yazıyoruz
    INSERT INTO ilanlar (baslik, fiyat, yapim_yili, ilan_tipi_id)
    VALUES (@Baslik, @Fiyat, @YapimYili, @IlanTipiId);

    -- ADIM B: SQL'in bu ilan için ürettiği otomatik ID'yi hafızaya alıyoruz
    DECLARE @YeniIlanId INT = SCOPE_IDENTITY();

    -- ADIM C: Arayüzden gelen Tipe göre dağıtım yapıyoruz
    -- Eğer İlan Tipi 1 (Kiralık) ise:
    IF @IlanTipiId = 1
    BEGIN
        INSERT INTO kiralik_ilanlar (ilan_id, esyali_mi, aidat_tutari, depozito_tutari)
        VALUES (@YeniIlanId, @EsyaliMi, @AidatTutari, @DepozitoTutari);
    END
    
    -- Eğer İlan Tipi 2 (Satılık) ise:
    ELSE IF @IlanTipiId = 2
    BEGIN
        INSERT INTO satilik_ilanlar (ilan_id, kredi_uygun_mu, tapu_harci_tutari)
        VALUES (@YeniIlanId, @KrediUygunMu, @TapuHarciTutari);
    END
END;
GO


 -- Bu proesedürü yapmamın sebebi, ilanlar tablosunda oluşturulan ilanda, kiralık tablosundaki olan sütunların olmamasından kaynaklı bir problem oluşmuştu.
 -- İlanlarda ben ilanı eklesem de kiralık ve satılık tablosundaki veriler boş kalıyordu. Bu yüzden ben arayüzde (İlan Oluştur) butonuna tıklandığında,
 -- İlan tipini Kiralık veya Satılık olarak seçtiğimizde, o tipe göre açılan inputlara göre verilerin eklenmesi gerekiyordu
 -- (Mesela kiralıksa input olarak  Eşyalı Mı? ve Aidat Tutarı input girdisi açılacak).
 -- Bu prosedür sayesinde eğer ilan tipi Kiralıksa  kiralık tablosundaki sütunlara, Satılıksa da satılık tabosunun sütunları na göre veri eklenmiş oldu.

 -- Kullanım: EXEC sp_ArayuzdenIlanKaydet 'Güzel Daire', 150000, 2020, 1, 1, 500, 1000, NULL, NULL
 -- Bu örnekte,  ilan_tipi_id: 1 olduğundan  bu kod çalışacak:
 --     IF @IlanTipiId = 1
 --   BEGIN
 --       INSERT INTO kiralik_ilanlar (ilan_id, esyali_mi, aidat_tutari, depozito_tutari)
 --       VALUES (@YeniIlanId, @EsyaliMi, @AidatTutari, @DepozitoTutari);
 --   END