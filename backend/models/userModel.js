const pool = require('./db');

const registerUser = async (username, email, hashedPassword) => {
    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    const [result] = await pool.query(sql, [username, email, hashedPassword]);
    return result;
};

const getUserByEmail = async (email) => {
    const sql = "SELECT * FROM users WHERE email = ?";
    const [result] = await pool.query(sql, [email]);
    return result[0];
};

module.exports = { registerUser, getUserByEmail };
