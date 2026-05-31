CREATE TABLE kiralik_ilanlar (
    ilan_id INT PRIMARY KEY,

    esyali_mi BIT NOT NULL,

    aidat_tutari INT
        CHECK (aidat_tutari >= 0),

    depozito_tutari INT
        CHECK (depozito_tutari >= 0),

    FOREIGN KEY (ilan_id)
        REFERENCES ilanlar(id) ON DELETE CASCADE
);