import mysql from "mysql2";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "chatbotdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default db.promise(); 