const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vaccination_db'
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'Server running' });
});

app.get('/api/children', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM children');
        conn.release();
        res.json({ status: 'success', data: rows });
    } catch (e) {
        res.json({ status: 'error', message: e.message });
    }
});

app.post('/api/children', async (req, res) => {
    try {
        const { full_name, nickname, date_of_birth, gender } = req.body;
        const conn = await pool.getConnection();
        const [result] = await conn.query(
            'INSERT INTO children (full_name, nickname, date_of_birth, gender) VALUES (?, ?, ?, ?)',
            [full_name, nickname, date_of_birth, gender]
        );
        conn.release();
        res.json({ status: 'success', child_id: result.insertId });
    } catch (e) {
        res.json({ status: 'error', message: e.message });
    }
});

app.get('/api/vaccinations/child/:id', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM vaccination_records WHERE child_id = ?', [req.params.id]);
        conn.release();
        res.json({ status: 'success', data: rows });
    } catch (e) {
        res.json({ status: 'error', message: e.message });
    }
});

app.post('/api/vaccinations', async (req, res) => {
    try {
        const { child_id, vaccine_id, status } = req.body;
        const conn = await pool.getConnection();
        await conn.query('INSERT INTO vaccination_records (child_id, vaccine_id, status) VALUES (?, ?, ?)',
            [child_id, vaccine_id, status]);
        conn.release();
        res.json({ status: 'success' });
    } catch (e) {
        res.json({ status: 'error', message: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`🔌 Health: GET http://localhost:${PORT}/api/health`);
    console.log(`📚 Database: ${process.env.DB_NAME || 'vaccination_db'}`);
});