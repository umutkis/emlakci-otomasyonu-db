CREATE TABLE calisanlar (
    id INT PRIMARY KEY IDENTITY(1,1),

    ad NVARCHAR(50) NOT NULL,
    soyad NVARCHAR(50) NOT NULL,

    telefon CHAR(11) UNIQUE NOT NULL,

    ise_baslama_tarihi DATE NOT NULL,
    olusturulma_tarihi DATETIME,
    guncellenme_tarihi DATETIME
);