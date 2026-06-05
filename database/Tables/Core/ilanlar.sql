CREATE TABLE ilanlar (
    id INT PRIMARY KEY IDENTITY(1,1),

    baslik NVARCHAR(100) NOT NULL,

    fiyat INT NOT NULL
        CHECK (fiyat > 0),

    emlak_tipi_id INT NOT NULL,
    oda_tipi_id INT NOT NULL,
    isitma_tipi_id INT NOT NULL,
    musteri_id INT NOT NULL,
    calisan_id INT NOT NULL,
    ilan_tipi_id INT NOT NULL,

    il NVARCHAR(50) NOT NULL,
    ilce NVARCHAR(50) NOT NULL,
    mahalle NVARCHAR(100),
    adres NVARCHAR(255),
    yapim_yili INT NOT NULL
        CHECK(yapim_yili > 1800),

    metrekare INT NOT NULL
        CHECK (metrekare > 0),

    bulundugu_kat INT,

    toplam_kat INT
        CHECK (toplam_kat > 0),

    balkon_sayisi INT
        CHECK (balkon_sayisi >= 0),

    wc_sayisi INT
        CHECK (wc_sayisi > 0),

    ilan_durumu_id INT NOT NULL,

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME NOT NULL DEFAULT GETDATE(),

    CHECK (
        bulundugu_kat IS NULL
        OR toplam_kat IS NULL
        OR bulundugu_kat <= toplam_kat
    ),

    FOREIGN KEY (emlak_tipi_id)
        REFERENCES emlak_tipleri(id),

    FOREIGN KEY (oda_tipi_id)
        REFERENCES oda_tipleri(id),

    FOREIGN KEY (isitma_tipi_id)
        REFERENCES isitma_tipleri(id),

    FOREIGN KEY (musteri_id)
        REFERENCES musteriler(id),

    FOREIGN KEY (calisan_id)
        REFERENCES calisanlar(id),

    FOREIGN KEY (ilan_durumu_id)
        REFERENCES ilan_durumlari(id),
        
    FOREIGN KEY (ilan_tipi_id)
        REFERENCES ilan_tipleri(id)
);
