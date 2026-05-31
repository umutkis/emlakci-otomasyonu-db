--aktif, pasif, kiralandı, satıldı gibi ilan durunmlarını hızlandırma için yapıldı
CREATE INDEX idx_ilanlar_durum
ON ilanlar (ilan_durumu_id);


--kullanıcı bu filtrelemeleri birlikte kullanacağı için bileşik indexleme  yapıldı
CREATE INDEX idx_ilanlar_konum_fiyat
ON ilanlar (il, ilce, fiyat);

