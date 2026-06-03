
const mssql = require('mssql');

async function writeLog(pool,userId, action, detail) {

    
    try {
        const activePool = pool || mssql;
        const request = activePool.request();
        await pool.request()
            .input('userId', mssql.Int, userId) // Login olmadığı için şimdilik hep null bırakıyorum.
            .input('action', mssql.NVarChar(255), action)
            .input('detail', mssql.NVarChar(255), detail)
            .query('INSERT INTO Logs (UserID, Action, Detail) VALUES (@userId, @action, @detail)');
        
        console.log(`[LOG KAYDEDİLDİ]: ${action}`);
    } catch (err) {
        console.error('Log veritabanına yazılamadı:', err.message);
    }
}

module.exports = { writeLog };

// Bu logger fonksiyonu, uygulamanın herhangi bir yerinde çağrılarak log kaydı oluşturabilir. Örneğin, bir kullanıcı giriş yaptığında veya bir ilan eklediğinde bu fonksiyon kullanılarak ilgili bilgileri Logs tablosuna kaydedebiliriz.
// Bu projemide daha profesyonel çalışmamızı sağlıcak.
//  Şu anlık sadece Çalışan ekleme için kod ekledim ama diğer işlemler içinde benzer şekilde eklicem.