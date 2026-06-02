CREATE TABLE satislar (
    id INT PRIMARY KEY IDENTITY(1,1),

    ilan_id INT NOT NULL,
    alici_id INT NOT NULL,
    satici_id INT NOT NULL,
    personel_id INT NOT NULL,

    satis_tarihi DATE NOT NULL,

    satis_tutari INT NOT NULL
        CHECK (satis_tutari > 0),

    kazanc_tutari INT NOT NULL
        CHECK (kazanc_tutari >= 0),

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME,

    UNIQUE (ilan_id),

    CHECK (alici_id <> satici_id),

    FOREIGN KEY (ilan_id)
        REFERENCES ilanlar(id),

    FOREIGN KEY (alici_id)
        REFERENCES musteriler(id),

    FOREIGN KEY (satici_id)
        REFERENCES musteriler(id),

    FOREIGN KEY (personel_id)
        REFERENCES calisanlar(id)
);
