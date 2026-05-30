CREATE TABLE musteriler (
    id INT PRIMARY KEY IDENTITY(1,1),

    ad NVARCHAR(50) NOT NULL
        CHECK (ad NOT LIKE '%[0-9]%'),

    soyad NVARCHAR(50) NOT NULL
        CHECK (soyad NOT LIKE '%[0-9]%'),

    tc_kimlik_no VARCHAR(11) UNIQUE
        CHECK (
            tc_kimlik_no IS NULL
            OR (
                LEN(tc_kimlik_no) = 11
                AND tc_kimlik_no NOT LIKE '%[^0-9]%'
            )
        ),

    telefon VARCHAR(11) UNIQUE NOT NULL
        CHECK (
            LEN(telefon) = 11
            AND telefon NOT LIKE '%[^0-9]%'
        ),

    olusturulma_tarihi DATETIME NOT NULL DEFAULT GETDATE(),
    guncellenme_tarihi DATETIME
);