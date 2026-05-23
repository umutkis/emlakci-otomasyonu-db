CREATE TABLE calisanlar (
    id INT PRIMARY KEY IDENTITY(1,1),

    ad NVARCHAR(50) NOT NULL,
    soyad NVARCHAR(50) NOT NULL,

    telefon CHAR(11) UNIQUE NOT NULL,

    personel_tipi_id INT NOT NULL,

    ise_baslama_tarihi DATE NOT NULL,

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME,

    FOREIGN KEY (personel_tipi_id)
        REFERENCES personel_tipleri(id)
);