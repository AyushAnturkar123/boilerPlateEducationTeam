import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

router.get('/', async(req, res) => {
    const {data, error} = await supabase
        .from('exercises')
        .select('*')
        .order('name', {ascending:true});
    
    if (error) return res.status(500).json({error:error.message});
    res.json(data); 
});

router.get('/:id', async(req, res) => {
    const id = Number(req.params.id);
    if(!Number.isInteger(id)) {
        return res.status(400).json({error:'id must be a number'});
    }

    const {data, error} = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    
        if (error) return res.status(500).json({error:error.message});
        if (!data) return res.status(404).json({error:'Exercise not found'});
        res.json(data);
});

router.post('/', async(req, res) => {
    const {name, muscle_group, type} = req.body ?? {};

    if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({error: 'name is required'});
    }

    if (muscle_group !== undefined && typeof muscle_group !== 'string') {
        return res.status(400).json({error: 'muscle_group must be text'});
    }

    if (type !== undefined && type !== 'strength' && type !== 'cardio') {
        return res.status(400).json({error: "type must be 'strength' or 'cardio'"});
    }

    const {data, error} = await supabase
        .from('exercises')
        .insert({name: name.trim(), muscle_group, type})
        .select()
        .single();

    if (error) return res.status(500).json({error: error.message});
    res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
    // 1. Check the id, if not number error 
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({error: 'id must be a number'});
    }

    // 2. get the feilds 
    const {name, muscle_group, type} = req.body ?? {};

    // 3. build the updates object, one field at a time
    const updates = {};

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({error: 'name must be non-empty text'});
        }
        updates.name = name.trim();
    }

    if (muscle_group !== undefined) {
        if (typeof muscle_group !== 'string') {
            return res.status(400).json({error: 'muscle_group must be text'});
        }
        updates.muscle_group = muscle_group;
    }

    if (type !== undefined) {
        if (type !== 'strength' && type !== 'cardio') {
            return res.status(400).json({error: "type must be 'strength' or 'cardio'"});
        }
        updates.type = type;
    }

    // 4. nothing to change?
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({error: 'send at least one field to update'});
    }

    // 5. update in supabase
    const {data, error} = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
    
    if (error) return res.status(500).json({error:error.message});
    if (!data) return res.status(404).json({error:'Exercise not found'});
    res.json(data);
})

router.delete('/:id', async (req, res) => {
    // 1. check the id
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({error: 'id must be a number'});
    }

    // 2. delete in supabase
    const {data, error} = await supabase
        .from('exercises')
        .delete()
        .eq('id', id) // Lines 120 + 121 means delete thr row where id equals this number
        .select()
        .maybeSingle(); // Lines 122 + 123 makes supabase return the deleted row
    
    // 3. respond
    if (error) return res.status(500).json({error: error.message});
    if (!data) return res.status(404).json({error: 'Exercise not found'});
    res.status(204).end(); // Sends status 204, which means it worked, nothing to send back. 
});

export default router; 