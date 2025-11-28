import mysql from "mysql2";

const db = mysql.createPool({
  host: "auth-db1151.hstgr.io",       
  user: "u987792045_root",        
  password: "Cordi@2025",    
  database: "u987792045_chatbotdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default db.promise();
