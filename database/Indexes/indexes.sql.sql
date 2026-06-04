--aktif, pasif, kiralandı, satıldı gibi ilan durunmlarını hızlandırma için yapıldı
CREATE INDEX idx_ilanlar_durum
ON ilanlar (ilan_durumu_id);


--kullanıcı bu filtrelemeleri birlikte kullanacağı için bileşik indexleme  yapıldı
CREATE INDEX idx_ilanlar_konum_fiyat
ON ilanlar (il, ilce, fiyat);

CREATE UNIQUE INDEX ux_musteriler_tc_kimlik_no
ON musteriler (tc_kimlik_no)
WHERE tc_kimlik_no IS NOT NULL;

CREATE INDEX idx_ilanlar_musteri
ON ilanlar (musteri_id);

CREATE INDEX idx_ilanlar_calisan
ON ilanlar (calisan_id);

CREATE INDEX idx_ilanlar_tipi
ON ilanlar (ilan_tipi_id);

CREATE INDEX idx_satilik_ilanlar_tapu_durumu
ON satilik_ilanlar (tapu_durumu_id);

CREATE INDEX idx_satislar_alici
ON satislar (alici_id);

CREATE INDEX idx_satislar_satici
ON satislar (satici_id);

CREATE INDEX idx_satislar_personel
ON satislar (personel_id);

CREATE INDEX idx_kira_sozlesmeleri_kiraci
ON kira_sozlesmeleri (kiraci_id);

CREATE INDEX idx_kira_sozlesmeleri_kiraya_veren
ON kira_sozlesmeleri (kiraya_veren_id);

CREATE INDEX idx_kira_sozlesmeleri_calisan
ON kira_sozlesmeleri (calisan_id);

CREATE INDEX idx_komisyonlar_personel
ON komisyonlar (personel_id);

CREATE INDEX idx_komisyonlar_kira_sozlesmesi
ON komisyonlar (kira_sozlesmesi_id);

CREATE INDEX idx_komisyonlar_satis
ON komisyonlar (satis_id);

CREATE INDEX idx_musteri_tipi_atamalari_tip
ON musteri_tipi_atamalari (musteri_tipi_id);
