CREATE TABLE musteriler (
    id INT PRIMARY KEY IDENTITY(1,1),

    ad NVARCHAR(50) NOT NULL,
    soyad NVARCHAR(50) NOT NULL,

    tc_kimlik_no CHAR(11) UNIQUE,
    telefon CHAR(11) UNIQUE NOT NULL,
    
    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME
);