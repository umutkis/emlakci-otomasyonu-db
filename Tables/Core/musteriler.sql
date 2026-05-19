CREATE TABLE musteriler (
    id INT PRIMARY KEY IDENTITY(1,1),
    ad NVARCHAR(50) NOT NULL,
    soyad NVARCHAR(50) NOT NULL,
    tc_kimlik_no CHAR(11) UNIQUE,
    telefon CHAR(11) UNIQUE NOT NULL,
    musteri_tipi_id INT NOT NULL,
    olusturulma_tarihi DATETIME2,
    guncellenme_tarihi DATETIME2
)