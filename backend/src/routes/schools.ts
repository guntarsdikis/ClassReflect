import { Router, Request, Response } from 'express';
import pool from '../database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Get all schools
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM schools WHERE is_active = TRUE ORDER BY name`
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// Get single school
router.get('/:schoolId', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM schools WHERE id = ?`,
      [schoolId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

// Create new school
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      address, 
      contactEmail, 
      contactPhone,
      maxMonthlyHours = 100,
      whisperModel = 'base'
    } = req.body;

    if (!name || !contactEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, contactEmail' 
      });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO schools (name, address, contact_email, contact_phone, max_monthly_hours, whisper_model) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, address, contactEmail, contactPhone, maxMonthlyHours, whisperModel]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      message: 'School created successfully'
    });
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// Update school
router.put('/:schoolId', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const updateFields = [];
    const values = [];

    const allowedFields = [
      'name', 'address', 'contact_email', 'contact_phone', 
      'max_monthly_hours', 'whisper_model', 'is_active'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(schoolId);

    await pool.execute(
      `UPDATE schools SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      schoolId,
      message: 'School updated successfully'
    });
  } catch (error) {
    console.error('Error updating school:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// Get school's analysis criteria
router.get('/:schoolId/criteria', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM analysis_criteria WHERE school_id = ? AND is_active = TRUE ORDER BY weight DESC`,
      [schoolId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({ error: 'Failed to fetch analysis criteria' });
  }
});

// Add analysis criterion for school
router.post('/:schoolId/criteria', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { name, description, category, weight = 1.0 } = req.body;

    if (!name || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, category' 
      });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO analysis_criteria (school_id, name, description, category, weight) 
       VALUES (?, ?, ?, ?, ?)`,
      [schoolId, name, description, category, weight]
    );

    res.status(201).json({
      id: result.insertId,
      schoolId,
      name,
      message: 'Analysis criterion created successfully'
    });
  } catch (error) {
    console.error('Error creating criterion:', error);
    res.status(500).json({ error: 'Failed to create analysis criterion' });
  }
});

export default router;