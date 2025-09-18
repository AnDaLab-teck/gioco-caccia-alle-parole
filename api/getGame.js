// File: api/getGame.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    try {
        const { difficulty } = req.body; // Riceve la difficoltà (1, 2, o 3) dal gioco

        if (!difficulty || ![1, 2, 3].includes(difficulty)) {
            return res.status(400).json({ error: "Livello di difficoltà non valido." });
        }

        // Chiama la nuova funzione SQL, passando sia il limite che la difficoltà
        const { data, error } = await supabase.rpc('get_random_questions_by_difficulty', { 
            limit_count: 10,
            difficulty_level: difficulty 
        });
        
        if (error) throw error;

        // Assicuriamoci che il formato sia perfetto per il gioco
        const gameData = data.map(q => ({
            word: q.word,
            category: q.category,
            correct: q.correct,
            distractors: q.distractors
        }));
        
        if (gameData.length < 10) {
            return res.status(500).json({ error: `Non ci sono abbastanza domande (trovate ${gameData.length}) di livello ${difficulty} nel database.` });
        }

        return res.status(200).json(gameData);

    } catch (error) {
        console.error("Errore nel recuperare le domande da Supabase:", error);
        return res.status(500).json({ error: "Impossibile caricare le domande dalla nostra biblioteca." });
    }
};
