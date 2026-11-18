import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// GET /api/example -> list all rows, newest first
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('example')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/example -> create a row. Body: { "title": "..." }
router.post('/', async (req, res) => {
  const { title } = req.body ?? {};

  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }

  const { data, error } = await supabase
    .from('example')
    .insert({ title: title.trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'id must be a number '});
  }

  const { data, error } = await supabase
    .from('example')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

export default router;
