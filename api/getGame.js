const { GoogleGenerativeAI } = require('@google/generative-ai');

// Funzione di validazione finale, assicura che ogni domanda sia completa
const validateQuestions = (questions) => {
    if (!Array.isArray(questions) || questions.length < 10) return false;
    
    return questions.every(q => 
        q.word && q.category && q.correct && 
        Array.isArray(q.distractors) && q.distractors.length >= 3
    );
};

module.exports = async (req, res) => {
    // Intestazioni anti-cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // 1. Usiamo il modello gemini-1.0-pro e attiviamo la modalità JSON
        const model = genAI.getGenerativeModel({
            model: "gemini-1.0-pro",
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        // 2. Definiamo lo schema JSON direttamente nel prompt, un'istruzione che questo modello gestisce meglio
        const prompt = `
            Genera una partita completa per il gioco 'Caccia alle Parole'.
            La tua risposta DEVE essere un oggetto JSON che rispetta questo schema:
            {
                "domande": [
                    {
                        "word": "stringa",
                        "category": "stringa",
                        "correct": "stringa",
                        "distractors": ["stringa", "stringa", "stringa"]
                    }
                ]
            }
            Crea esattamente 10 oggetti unici all'interno dell'array "domande".
            Le parole e le definizioni devono essere semplici e adatte a ragazzi con un'età mentale di 10-12 anni.
        `;
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        const gameData = JSON.parse(response.text());

        // 3. Eseguiamo un ultimo controllo di qualità
        const questions = gameData.domande;
        if (!validateQuestions(questions)) {
            throw new Error("L'IA ha generato dati incompleti o non validi.");
        }

        const wordSet = new Set(questions.map(q => q.word));
        if (wordSet.size < 10) {
            throw new Error("L'IA ha generato parole duplicate.");
        }
        
        // 4. Dato che il server ora garantisce le chiavi corrette, inviamo direttamente l'array di domande
        return res.status(200).json(questions);

    } catch (error) {
        console.error("Errore critico nella generazione della partita:", error);
        return res.status(500).json({ error: "Si è verificato un errore interno nel generare la partita.", details: error.message });
    }
};
