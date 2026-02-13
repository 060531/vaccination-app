const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'Server running' });
});

// GET all children
app.get('/api/children', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM children ORDER BY created_at DESC');
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

// POST create child
app.post('/api/children', async (req, res) => {
    try {
        const { full_name, nickname, date_of_birth, gender, mother_name } = req.body;
        const result = await pool.query(
            'INSERT INTO children (full_name, nickname, date_of_birth, gender, mother_name) VALUES ($1, $2, $3, $4, $5) RETURNING child_id',
            [full_name, nickname, date_of_birth, gender, mother_name]
        );
        res.json({ 
            status: 'success',
            data: { child_id: result.rows[0].child_id, full_name, nickname, date_of_birth, gender }
        });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

// GET vaccinations by child
app.get('/api/vaccinations/child/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM vaccination_records WHERE child_id = $1 ORDER BY vaccine_id',
            [req.params.id]
        );
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

// POST record vaccination
app.post('/api/vaccinations', async (req, res) => {
    try {
        const { child_id, vaccine_id, status } = req.body;
        await pool.query(
            'INSERT INTO vaccination_records (child_id, vaccine_id, status) VALUES ($1, $2, $3)',
            [child_id, vaccine_id, status]
        );
        res.json({ status: 'success' });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`🔌 Health: GET http://localhost:${PORT}/api/health`);
});