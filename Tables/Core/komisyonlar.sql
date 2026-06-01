CREATE TABLE komisyonlar (
    id INT PRIMARY KEY IDENTITY(1,1),

    personel_id INT NOT NULL,
    kira_sozlesmesi_id INT,
    satis_id INT,

    komisyon_tutari INT NOT NULL
        CHECK (komisyon_tutari > 0),

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME,

    CHECK (
        (kira_sozlesmesi_id IS NOT NULL AND satis_id IS NULL)
        OR
        (kira_sozlesmesi_id IS NULL AND satis_id IS NOT NULL)
    ),

    FOREIGN KEY (personel_id)
        REFERENCES calisanlar(id),

    FOREIGN KEY (kira_sozlesmesi_id)
        REFERENCES kira_sozlesmeleri(id),

    FOREIGN KEY (satis_id)
        REFERENCES satislar(id)
);
