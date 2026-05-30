CREATE TABLE kira_sozlesmeleri (
    id INT PRIMARY KEY IDENTITY(1,1),

    ilan_id INT NOT NULL,
    kiraci_id INT NOT NULL,
    kiraya_veren_id INT NOT NULL,
    calisan_id INT NOT NULL,

    sozlesme_baslangic_tarihi DATE NOT NULL,

    sozlesme_suresi_ay INT NOT NULL DEFAULT 12
        CHECK (sozlesme_suresi_ay > 0),

    sozlesme_bitis_tarihi AS DATEADD(
        MONTH,
        sozlesme_suresi_ay,
        sozlesme_baslangic_tarihi
    ),

    aylik_kira_tutari INT NOT NULL
        CHECK (aylik_kira_tutari > 0),

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME,

    CHECK (kiraci_id <> kiraya_veren_id),

    FOREIGN KEY (ilan_id)
        REFERENCES ilanlar(id),

    FOREIGN KEY (kiraci_id)
        REFERENCES musteriler(id),

    FOREIGN KEY (kiraya_veren_id)
        REFERENCES musteriler(id),

    FOREIGN KEY (calisan_id)
        REFERENCES calisanlar(id)
);