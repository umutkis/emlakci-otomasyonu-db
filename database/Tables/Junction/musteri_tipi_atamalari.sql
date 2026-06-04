CREATE TABLE musteri_tipi_atamalari (
    musteri_id INT NOT NULL,
    musteri_tipi_id INT NOT NULL,

    PRIMARY KEY (musteri_id, musteri_tipi_id),

    FOREIGN KEY (musteri_id)
        REFERENCES musteriler(id) ON DELETE CASCADE,

    FOREIGN KEY (musteri_tipi_id)
        REFERENCES musteri_tipleri(id)
);
