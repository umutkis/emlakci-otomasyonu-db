CREATE TABLE ilanlar (
    id INT PRIMARY KEY IDENTITY(1,1),

    baslik NVARCHAR(100) NOT NULL,
    fiyat DECIMAL(12,2) NOT NULL,

    emlak_tipi_id INT NOT NULL,
    oda_tipi_id INT NOT NULL,
    isitma_tipi_id INT NOT NULL,
    musteri_id INT NOT NULL,
    calisan_id INT NOT NULL,

    il NVARCHAR(50) NOT NULL,
    ilce NVARCHAR(50) NOT NULL,
    mahalle NVARCHAR(100),
    adres NVARCHAR(255),

    metrekare INT NOT NULL,
    bina_yasi INT,
    bulundugu_kat INT,
    toplam_kat INT,
    balkon_sayisi INT,
    wc_sayisi INT,

    ilan_durumu_id INT NOT NULL,

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME,

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
        REFERENCES ilan_durumlari(id)
);