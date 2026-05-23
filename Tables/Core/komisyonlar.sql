CREATE TABLE komisyonlar (
    id INT PRIMARY KEY IDENTITY(1,1),

    personel_id INT NOT NULL,
    kira_sozlesmesi_id INT,
    satis_id INT,

    komisyon_tutari DECIMAL(12,2) NOT NULL,

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME,

    FOREIGN KEY (personel_id)
        REFERENCES calisanlar(id),

    FOREIGN KEY (kira_sozlesmesi_id)
        REFERENCES kira_sozlesmeleri(id),

    FOREIGN KEY (satis_id)
        REFERENCES satislar(id)
);