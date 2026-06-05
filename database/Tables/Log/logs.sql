CREATE TABLE Logs(
    LogID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    Action VARCHAR(255) NOT NULL,
    Detail VARCHAR(255) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    --FOREIGN KEY (UserID) REFERENCES Users(UserID) -- login işlemi oluşturulduğunda aktif edilecek



);