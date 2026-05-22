CREATE TABLE kiralik_ilanlar (
    ilan_id INT PRIMARY KEY,

    esyali_mi BIT NOT NULL,
    aidat_tutari DECIMAL(12,2),
    depozito_tutari DECIMAL(12,2),

    FOREIGN KEY (ilan_id)
        REFERENCES ilanlar(id)
);