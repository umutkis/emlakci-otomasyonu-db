const mssql = require('mssql');

async function writeLog(pool, userId, action, detail) {
  try {
    const activePool = pool || mssql;
    
    // Check if the same log record was written in the last 3 seconds
    const dupCheck = await activePool.request()
      .input('userIdCheck', mssql.Int, userId)
      .input('actionCheck', mssql.NVarChar(255), action)
      .input('detailCheck', mssql.NVarChar(255), detail)
      .query(`
        SELECT TOP 1 LogID FROM Logs 
        WHERE UserID = @userIdCheck AND Action = @actionCheck AND Detail = @detailCheck 
        AND CreatedAt >= DATEADD(second, -3, GETDATE())
      `);

    if (dupCheck.recordset && dupCheck.recordset.length > 0) {
      console.log(`[LOG BLOCKED (DUPLICATE)]: ${action}`);
      return;
    }

    await activePool.request()
      .input('userId', mssql.Int, userId)
      .input('action', mssql.NVarChar(255), action)
      .input('detail', mssql.NVarChar(255), detail)
      .query('INSERT INTO Logs (UserID, Action, Detail) VALUES (@userId, @action, @detail)');
    
    console.log(`[LOG KAYDEDİLDİ]: ${action}`);
  } catch (err) {
    console.error('Log veritabanına yazılamadı:', err.message);
  }
}

module.exports = { writeLog };