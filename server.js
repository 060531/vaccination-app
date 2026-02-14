const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/vaccination_app.html');
});

app.get('/api/children', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM children ORDER BY created_at DESC');
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

app.post('/api/children', async (req, res) => {
    try {
        const { full_name, nickname, date_of_birth, gender, mother_name, room } = req.body;
        const result = await pool.query(
            'INSERT INTO children (full_name, nickname, date_of_birth, gender, mother_name, room) VALUES ($1, $2, $3, $4, $5, $6) RETURNING child_id',
            [full_name, nickname, date_of_birth, gender, mother_name, room]
        );
        res.json({ status: 'success', data: { child_id: result.rows[0].child_id } });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

app.get('/api/vaccinations/child/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM vaccination_records WHERE child_id = $1',
            [req.params.id]
        );
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

app.post('/api/vaccinations', async (req, res) => {
    try {
        const { child_id, vaccine_id, status } = req.body;
        
        // UPSERT: ลบ record เก่า แล้ว insert record ใหม่
        await pool.query(
            'DELETE FROM vaccination_records WHERE child_id = $1 AND vaccine_id = $2',
            [child_id, vaccine_id]
        );
        
        await pool.query(
            'INSERT INTO vaccination_records (child_id, vaccine_id, status) VALUES ($1, $2, $3)',
            [child_id, vaccine_id, status]
        );
        
        res.json({ status: 'success' });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

// Dashboard API
app.get('/api/dashboard', async (req, res) => {
    try {
        const children = await pool.query('SELECT COUNT(*) FROM children');
        const vaccinated = await pool.query(
            'SELECT COUNT(DISTINCT child_id) FROM vaccination_records WHERE status = $1',
            ['Given']
        );
        const byRoom = await pool.query(
            'SELECT room, COUNT(*) as count FROM children GROUP BY room ORDER BY room'
        );
        
        res.json({
            status: 'success',
            data: {
                totalChildren: parseInt(children.rows[0].count),
                vaccinated: parseInt(vaccinated.rows[0].count),
                byRoom: byRoom.rows
            }
        });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));