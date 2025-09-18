// File: api/getGame.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); // Previene la cache

    try {
        // Chiamiamo la funzione SQL che abbiamo creato in Supabase per pescare 10 domande a caso
        const { data, error } = await supabase.rpc('get_random_questions', { limit_count: 10 });
        
        if (error) throw error;

        // Il server si assicura che il formato sia perfetto per il gioco
        const gameData = data.map(q => ({
            word: q.word,
            category: q.category,
            correct: q.correct,
            distractors: q.distractors
        }));

        return res.status(200).json(gameData);

    } catch (error) {
        console.error("Errore nel recuperare le domande da Supabase:", error);
        return res.status(500).json({ error: "Impossibile caricare le domande dalla nostra biblioteca." });
    }
};
