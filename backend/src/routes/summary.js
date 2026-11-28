import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// turns a Javascript Date into YYYY-MM-DD text
function toDateString(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// GET route - stats calculated from workouts
router.get('/', async (req, res) => {
    // 1. get all workouts
    const {data: workouts, error} = await supabase
        .from('workouts')
        .select('id, date, workout_sets(id, duration_min)');
    
    if (error) return res.status(500).json({error: error.message});

    // 2. workout of the date this week started (Monday)
    const today = new Date();
    const daysSinceMonday = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday);
    const weekStart = toDateString(monday);

    // 3. keep only workouts from this week
    const thisWeek = workouts.filter(w => w.date >= weekStart);

    // 4. count all the sets in this week's workouts
    const setsThisWeek = thisWeek.reduce((total, w) => total + w.workout_sets.length, 0);

    // 5. add up cardio minutes from this week's sets
    const allSets = thisWeek.flatMap(w => w.workout_sets);
    const cardioMinutes = allSets.reduce((total, s) => total + (s.duration_min ?? 0), 0);

    // 6. send back the numbers
    res.json({
        week_start: weekStart,
        workouts_this_week: thisWeek.length,
        sets_this_week: setsThisWeek,
        cardio_minutes_this_week: cardioMinutes,
    });
});

export default router;

