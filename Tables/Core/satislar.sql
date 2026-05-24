CREATE TABLE satislar (
    id INT PRIMARY KEY IDENTITY(1,1),

    ilan_id INT NOT NULL,
    alici_id INT,
    satici_id INT NOT NULL,
    calisan_id INT NOT NULL,

    satis_tarihi DATE NOT NULL,
    satis_tutari DECIMAL(12,2) NOT NULL,
    kazanc_tutari DECIMAL(12,2) NOT NULL,

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME,

    FOREIGN KEY (ilan_id)
        REFERENCES ilanlar(id),

    FOREIGN KEY (alici_id)
        REFERENCES musteriler(id),

    FOREIGN KEY (satici_id)
        REFERENCES musteriler(id),

    FOREIGN KEY (calisan_id)
        REFERENCES calisanlar(id)
);
