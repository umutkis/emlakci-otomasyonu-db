CREATE TABLE satilik_ilanlar (
    ilan_id INT PRIMARY KEY,

    tapu_durumu_id INT NOT NULL,
    krediye_uygun_mu BIT NOT NULL,

    FOREIGN KEY (ilan_id)
        REFERENCES ilanlar(id),

    FOREIGN KEY (tapu_durumu_id)
        REFERENCES tapu_durumlari(id)
);