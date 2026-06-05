CREATE PROCEDURE sp_ArayuzdenIlanKaydet
    @Baslik NVARCHAR(100),
    @Fiyat INT,
    @EmlakTipiId INT,
    @OdaTipiId INT,
    @IsitmaTipiId INT,
    @MusteriId INT,
    @CalisanId INT,
    @IlanTipiId INT,
    @Il NVARCHAR(50),
    @Ilce NVARCHAR(50),
    @YapimYili INT,
    @Metrekare INT,
    @IlanDurumuId INT = NULL,
    @Mahalle NVARCHAR(100) = NULL,
    @Adres NVARCHAR(255) = NULL,
    @BulunduguKat INT = NULL,
    @ToplamKat INT = NULL,
    @BalkonSayisi INT = NULL,
    @WcSayisi INT = NULL,
    @EsyaliMi BIT = NULL,
    @AidatTutari INT = NULL,
    @DepozitoTutari INT = NULL,
    @TapuDurumuId INT = NULL,
    @KrediyeUygunMu BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IlanTipiAdi NVARCHAR(50);
    DECLARE @YeniIlanId INT;

    SELECT @IlanTipiAdi = tip_adi
    FROM ilan_tipleri
    WHERE id = @IlanTipiId;

    IF @IlanTipiAdi IS NULL
    BEGIN
        THROW 50001, 'Gecersiz ilan_tipi_id.', 1;
    END;

    IF @IlanDurumuId IS NULL
    BEGIN
        SELECT @IlanDurumuId = id
        FROM ilan_durumlari
        WHERE durum_adi = N'Aktif';
    END;

    IF @IlanDurumuId IS NULL
    BEGIN
        THROW 50002, 'Aktif ilan durumu bulunamadi.', 1;
    END;

    IF @IlanTipiAdi = N'Satılık' AND @TapuDurumuId IS NULL
    BEGIN
        THROW 50003, 'Satilik ilan icin tapu_durumu_id zorunludur.', 1;
    END;

    BEGIN TRANSACTION;

    INSERT INTO ilanlar (
        baslik,
        fiyat,
        emlak_tipi_id,
        oda_tipi_id,
        isitma_tipi_id,
        musteri_id,
        calisan_id,
        ilan_tipi_id,
        il,
        ilce,
        mahalle,
        adres,
        yapim_yili,
        metrekare,
        bulundugu_kat,
        toplam_kat,
        balkon_sayisi,
        wc_sayisi,
        ilan_durumu_id
    )
    VALUES (
        @Baslik,
        @Fiyat,
        @EmlakTipiId,
        @OdaTipiId,
        @IsitmaTipiId,
        @MusteriId,
        @CalisanId,
        @IlanTipiId,
        @Il,
        @Ilce,
        @Mahalle,
        @Adres,
        @YapimYili,
        @Metrekare,
        @BulunduguKat,
        @ToplamKat,
        @BalkonSayisi,
        @WcSayisi,
        @IlanDurumuId
    );

    SET @YeniIlanId = CONVERT(INT, SCOPE_IDENTITY());

    IF @IlanTipiAdi = N'Kiralık'
    BEGIN
        INSERT INTO kiralik_ilanlar (
            ilan_id,
            esyali_mi,
            aidat_tutari,
            depozito_tutari
        )
        VALUES (
            @YeniIlanId,
            ISNULL(@EsyaliMi, 0),
            @AidatTutari,
            @DepozitoTutari
        );
    END
    ELSE IF @IlanTipiAdi = N'Satılık'
    BEGIN
        INSERT INTO satilik_ilanlar (
            ilan_id,
            tapu_durumu_id,
            krediye_uygun_mu
        )
        VALUES (
            @YeniIlanId,
            @TapuDurumuId,
            ISNULL(@KrediyeUygunMu, 0)
        );
    END
    ELSE
    BEGIN
        THROW 50004, 'Ilan tipi Kiralik veya Satilik olmali.', 1;
    END;

    COMMIT TRANSACTION;
END;
GO
