import express from 'express';
import { pool } from '../db.js'; // Adjust path to your shared database pool if it's located elsewhere (e.g., ../db.js)

const router = express.Router();

// GET: Fetch all drinks types
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drinks_type ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching drinks types:", err);
    res.status(500).json({ error: "Server error fetching drinks types" });
  }
});

// POST: Create a new drinks type
router.post('/', async (req, res) => {
  try {
    const { name, description, img, thumbnail, status, created_at, updated_at } = req.body;
    
    const query = `
      INSERT INTO drinks_type (name, description, img, thumbnail, status, created_at, updated_at)
      VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      JSON.stringify(name),
      JSON.stringify(description),
      img || null,
      thumbnail || null,
      status ?? 1,
      created_at || new Date().toISOString(),
      updated_at || new Date().toISOString()
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating drinks type:", err);
    res.status(500).json({ error: "Server error creating drinks type" });
  }
});

// PUT: Update an existing drinks type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, img, thumbnail, status, updated_at } = req.body;

    const query = `
      UPDATE drinks_type 
      SET name = $1::jsonb, description = $2::jsonb, img = $3, thumbnail = $4, status = $5, updated_at = $6
      WHERE id = $7
      RETURNING *;
    `;
    const values = [
      JSON.stringify(name),
      JSON.stringify(description),
      img,
      thumbnail,
      status,
      updated_at || new Date().toISOString(),
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Drinks type not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating drinks type:", err);
    res.status(500).json({ error: "Server error updating drinks type" });
  }
});

// DELETE: Remove a drinks type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM drinks_type WHERE id = $1 RETURNING *;', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Drinks type not found" });
    }
    res.json({ message: "Drinks type deleted successfully", id });
  } catch (err) {
    console.error("Error deleting drinks type:", err);
    res.status(500).json({ error: "Server error deleting drinks type" });
  }
});

export default router;