INSERT INTO personel_tipleri (tip_adi)
VALUES
    ('Patron'),
    ('Çalışan');

INSERT INTO musteri_tipleri (tip_adi)
VALUES
    ('Alıcı'),
    ('Satıcı'),
    ('Kiracı'),
    ('Kiraya Veren'); -- Satıcı ve Kiraya Veren en iyi seçenek mi tekrar düşün.

INSERT INTO ilan_durumlari (durum_adi)
VALUES
    ('Aktif'),
    ('Pasif'),
    ('Kiralandı'),
    ('Satıldı');  

INSERT INTO tapu_durumlari (durum_adi)
VALUES
    ('Kat Mülkiyetli'),
    ('Kat İrtifaklı'),
    ('Hisseli Tapu'),
    ('Arsa Tapulu'),
    ('Müstakil Tapulu');     

INSERT INTO emlak_tipleri (tip_adi)
VALUES
    ('Daire'),
    ('Villa'),
    ('Müstakil Ev'),
    ('Arsa'),
    ('Ofis'),
    ('Dükkan');        

INSERT INTO isitma_tipleri (tip_adi)
VALUES
    ('Kombi'),
    ('Merkezi'),
    ('Soba'),
    ('Klima'),
    ('Yerden Isıtma'),
    ('Doğalgaz Sobası'),
    ('Kat Kaloriferi'),
    ('Yok');   

INSERT INTO oda_tipleri (tip_adi)
VALUES
    ('1+0'),
    ('1+1'),
    ('1.5+1'),
    ('2+0'),
    ('2+1'),
    ('2.5+1'),
    ('3+1'),
    ('3.5+1'),
    ('4+1'),
    ('4.5+1'),
    ('5+1'),
    ('5+2'),
    ('6+1'),
    ('6+2');    