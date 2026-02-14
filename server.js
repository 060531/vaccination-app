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

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/vaccination_app.html');
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

// POST new child
app.post('/api/children', async (req, res) => {
    try {
        const { full_name, nickname, date_of_birth, gender, mother_name, room } = req.body;
        
        const result = await pool.query(
            'INSERT INTO children (full_name, nickname, date_of_birth, gender, mother_name, room) VALUES ($1, $2, $3, $4, $5, $6) RETURNING child_id',
            [full_name, nickname || null, date_of_birth, gender || null, mother_name || null, room || null]
        );
        
        res.json({ status: 'success', data: { child_id: result.rows[0].child_id } });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

// UPDATE child
app.put('/api/children/:id', async (req, res) => {
    try {
        const { full_name, nickname, date_of_birth, gender, mother_name, room } = req.body;
        
        await pool.query(
            'UPDATE children SET full_name=$1, nickname=$2, date_of_birth=$3, gender=$4, mother_name=$5, room=$6 WHERE child_id=$7',
            [full_name, nickname || null, date_of_birth, gender || null, mother_name || null, room || null, req.params.id]
        );
        
        res.json({ status: 'success' });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

// GET vaccinations for child
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

// POST vaccination (UPSERT)
app.post('/api/vaccinations', async (req, res) => {
    try {
        const { child_id, vaccine_id, status } = req.body;
        
        // ลองลบก่อน
        await pool.query(
            'DELETE FROM vaccination_records WHERE child_id = $1 AND vaccine_id = $2',
            [child_id, vaccine_id]
        );
        
        // insert record ใหม่
        await pool.query(
            'INSERT INTO vaccination_records (child_id, vaccine_id, status) VALUES ($1, $2, $3)',
            [child_id, vaccine_id, status]
        );
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Vaccination error:', error);
        res.json({ status: 'error', message: error.message });
    }
});

// Dashboard API
app.get('/api/dashboard', async (req, res) => {
    try {
        // Total children
        const children = await pool.query('SELECT COUNT(*) as count FROM children');
        
        // Vaccine statistics
        const stats = await pool.query(`
            SELECT 
                SUM(CASE WHEN status = 'Given' THEN 1 ELSE 0 END) as given,
                SUM(CASE WHEN status = 'Not Given' THEN 1 ELSE 0 END) as not_given,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
            FROM vaccination_records
        `);
        
        // By room
        const byRoom = await pool.query(`
            SELECT room, COUNT(*) as count 
            FROM children 
            WHERE room IS NOT NULL 
            GROUP BY room 
            ORDER BY room
        `);
        
        res.json({
            status: 'success',
            data: {
                totalChildren: parseInt(children.rows[0].count),
                vaccineStats: {
                    given: parseInt(stats.rows[0].given || 0),
                    not_given: parseInt(stats.rows[0].not_given || 0),
                    pending: parseInt(stats.rows[0].pending || 0)
                },
                byRoom: byRoom.rows
            }
        });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

// DELETE child
app.delete('/api/children/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM vaccination_records WHERE child_id = $1', [req.params.id]);
        await pool.query('DELETE FROM children WHERE child_id = $1', [req.params.id]);
        res.json({ status: 'success' });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));