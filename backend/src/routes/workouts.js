import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// GET route lists all the workouts, newest first
router.get('/', async (req, res) => {
    const {data, error} = await supabase
        .from('workouts')
        .select('*')
        .order('date', {ascending: false})
        .order('id', {ascending: false});
    
        if (error) return res.status(500).json({error: error.message});
        res.json(data);
});

router.post('/', async (req, res) => {
    //1. get the feilds
    const {name, date, notes} = req.body ?? {};

    //2. check them 
    if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({error: 'name is required'});
    }

    if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
        return res.status(400).json({error: 'date must look like YYYY-MM-DD'});
    }

    if (notes !== undefined && typeof notes !== 'string') {
        return res.status(400).json({error: 'notes must be text'});
    }

    // 3. insert into supabase
    const {data, error} = await supabase
        .from('workouts')
        .insert({name: name.trim(), date, notes})
        .select()
        .single();
    
    // 4. respond
    if (error) return res.status(500).json({error: error.message});
    res.status(201).json(data);
});

router.get('/:id', async (req, res) => {
    //1. check the id
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({error: 'id must be a number'});
    }

    //2. get the workout + its sets + each set's exercise
    const {data, error} = await supabase
        .from('workouts')
        .select('*, workout_sets(id, reps, weight, duration_min, exercises(id, name, type))')
        .eq('id', id)
        .order('id', {referencedTable: 'workout_sets', ascending: true})
        .maybeSingle();

    // 3. respond
    if (error) return res.status(500).json({error: error.message});
    if (!data) return res.status(404).json({error: 'Workout not found'});
    res.json(data);
});

// PATCH /api/workouts/:id — edit a workout's name, date, or notes
router.patch('/:id', async (req, res) => {
    // 1. check the id
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({error: 'id must be a number'});
    }

    // 2. get the fields
    const {name, date, notes} = req.body ?? {};

    // 3. build the updates object, one field at a time
    const updates = {};

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({error: 'name must be non-empty text'});
        }
        updates.name = name.trim();
    }

    if (date !== undefined) {
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({error: 'date must look like YYYY-MM-DD'});
        }
        updates.date = date;
    }

    if (notes !== undefined) {
        if (notes !== null && typeof notes !== 'string') {
            return res.status(400).json({error: 'notes must be text or null'});
        }
        updates.notes = notes;
    }

    // 4. nothing to change?
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({error: 'send at least one field to update'});
    }

    // 5. update in supabase
    const {data, error} = await supabase
        .from('workouts')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) return res.status(500).json({error: error.message});
    if (!data) return res.status(404).json({error: 'Workout not found'});
    res.json(data);
});

router.delete('/:id', async (req, res) => {
    // 1. check the id
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({error: 'id must be a number'});
    }

    // 2. delete in supabase
    const {data, error} = await supabase
        .from('workouts')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();
    
    // 3. respond
    if (error) return res.status(500).json({error: error.message});
    if (!data) return res.status(404).json({error: 'Workout not found'});
    res.status(204).end();
});

// Post adds a set to a workout
router.post('/:id/sets', async (req, res) => {
    // 1. check the workout id from the URL 
    const workoutId = Number(req.params.id);
    if (!Number.isInteger(workoutId)) {
        return res.status(400).json({error: 'workout id must be a number'});
    }

    // 2. get and check the body fields
    const {exercise_id, reps, weight, duration_min} = req.body ?? {};

    if (!Number.isInteger(exercise_id)) {
        return res.status(400).json({error: 'exercise_id is required and must be a number'});
    }

    if (reps !== undefined && (!Number.isInteger(reps) || reps <= 0)) {
        return res.status(400).json({error: 'reps must be a whole number above 0'});
    }

    if (weight !== undefined && (typeof weight !== 'number' || weight < 0)) {
        return res.status(400).json({error: 'weight must be a number, 0 or more'});
    }

    if (duration_min !== undefined && (typeof duration_min !== 'number' || duration_min <= 0)) {
        return res.status(400).json({error: 'duration_min must be a number above 0'});
    }

    // 3. make sure the workout exists
    const {data: workout, error: workoutError} = await supabase
        .from('workouts')
        .select('id')
        .eq('id', workoutId)
        .maybeSingle();

    if (workoutError) return res.status(500).json({error: workoutError.message});
    if (!workout) return res.status(404).json({error: 'Workout not found'});

    // 4. make sure exercise exists and get its type
    const {data: exercise, error: exerciseError} = await supabase
        .from('exercises')
        .select('id, type')
        .eq('id', exercise_id)
        .maybeSingle();
    
    if (exerciseError) return res.status(500).json({error: exerciseError.message});
    if (!exercise) return res.status(404).json({error: 'Exercise not found'});

    // 5. check if the set fits the exercise type
    if (exercise.type === 'strength' && reps === undefined) {
        return res.status(400).json({error: 'strength sets need reps'});
    }

    if (exercise.type === 'cardio' && duration_min === undefined) {
        return res.status(400).json({error: 'cardio sets need duration_min'});
    }

    // 6. insert the set and send it back
    const {data, error} = await supabase
        .from('workout_sets')
        .insert({workout_id: workoutId, exercise_id, reps, weight, duration_min})
        .select('id, workout_id, reps, weight, duration_min, exercises(id, name, type)')
        .single();

    if (error) return res.status(500).json({error: error.message});
    res.status(201).json(data);
});

// DETELE removes one set from a workout
router.delete('/:id/sets/:setId', async (req, res) => {
    // 1. check both ids from the URL 
    const workoutId = Number(req.params.id);
    const setId = Number(req.params.setId);

    if (!Number.isInteger(workoutId) || !Number.isInteger(setId)) {
        return res.status(400).json({error: 'workout id and set id must be numbers'});
    }

    // 2. delete the set only if it belongs to this workout
    const {data, error} = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId)
        .eq('workout_id', workoutId)
        .select()
        .maybeSingle();
    
    // 3. respond
    if (error) return res.status(500).json({error: error.message});
    if (!data) return res.status(404).json({error: 'Set not found in this workout'});
    res.status(204).end();
});

export default router; 