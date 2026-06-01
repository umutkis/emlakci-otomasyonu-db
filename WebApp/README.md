# Emlakçı Otomasyonu Web Arayüzü

Bu arayüz SQL Server'a bağlanan basit bir Node.js uygulamasıdır.

## Kurulum

1. Microsoft SQL Server'da veritabanını ve SQL dosyalarını oluştur.
2. Bu klasörde `.env.example` dosyasını `.env` olarak kopyala.
3. `.env` içindeki SQL Server bilgilerini düzenle.
4. Terminalde bu klasörde çalıştır:

```bash
npm install
npm start
```

5. Tarayıcıdan aç:

```text
http://localhost:3000
```

## Notlar

- SQL Server Browser/port ayarları açıksa bağlantı daha sorunsuz olur.
- Windows Authentication kullanılacaksa `DB_USER` / `DB_PASSWORD` yerine ek ayar gerekir; mevcut yapı SQL kullanıcı adı/şifre ile çalışacak şekilde hazırlanmıştır.
- Önce referans verileri seed edilmelidir; ilan ekleme ekranı ilan tipi, emlak tipi, oda tipi gibi listeleri SQL Server'dan çeker.
