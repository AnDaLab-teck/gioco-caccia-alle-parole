const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    try {
        // Il body della richiesta su Vercel si trova in req.body
        const { difficulty, usedWords } = req.body;
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const difficultyMap = {
            1: "Base (facile, per ragazzi di 12 anni)",
            2: "Intermedio (di media difficoltà, per ragazzi di 14 anni)",
            3: "Avanzato (più difficile ma non tecnico, per ragazzi di 16 anni)"
        };

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `
            Sei un esperto di vocabolario italiano per adolescenti.
            Il tuo compito è creare una domanda per un gioco a quiz chiamato "Caccia alle Parole".
            Devi generare UNA SOLA parola con la sua definizione e 3 distrattori.
            La parola non deve essere una di queste: ${usedWords.join(', ')}.
            Requisiti:
            - Livello di difficoltà: ${difficultyMap[difficulty]}.
            - Categoria: Scegli una tu tra le seguenti: Emozioni, Natura, Sport, Scienza, Cibo, Arte, Geografia.
            - La definizione deve essere chiara, concisa e adatta a un ragazzo di 12-16 anni.
            - I 3 distrattori devono essere plausibili ma chiaramente sbagliati.
            Fornisci la risposta ESCLUSIVAMENTE in formato JSON, così:
            {
              "word": "La tua parola generata",
              "category": "La categoria scelta o data",
              "level": ${difficulty},
              "correct": "La definizione corretta",
              "distractors": ["Distrattore 1", "Distrattore 2", "Distrattore 3"]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonResponse = JSON.parse(text.replace(/```json/g, '').replace(/```g, '').trim());

        // Vercel usa res.status().json() per inviare la risposta
        res.status(200).json(jsonResponse);

    } catch (error) {
        console.error("ERRORE DETTAGLIATO DALLA FUNZIONE:", error);
        res.status(500).json({ error: "Errore durante la generazione della parola.", details: error.message });
    }
};
