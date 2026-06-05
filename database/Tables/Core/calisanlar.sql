CREATE TABLE calisanlar (
    id INT PRIMARY KEY IDENTITY(1,1),

    ad NVARCHAR(50) NOT NULL
        CHECK (ad NOT LIKE '%[0-9]%'),

    soyad NVARCHAR(50) NOT NULL
        CHECK (soyad NOT LIKE '%[0-9]%'),

    telefon VARCHAR(11) UNIQUE NOT NULL
        CHECK (
            LEN(telefon) = 11               -- 0555 555 55 55
            AND telefon NOT LIKE '%[^0-9]%'
        ),

    personel_tipi_id INT NOT NULL,

    ise_baslama_tarihi DATE NOT NULL,

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME NOT NULL DEFAULT GETDATE(),

    FOREIGN KEY (personel_tipi_id)
        REFERENCES personel_tipleri(id)
); 