const { GoogleGenerativeAI } = require('@google/generative-ai');

// Funzione per validare un singolo oggetto parola
const validateWordObject = (wordObj) => {
    const word = wordObj.parola || wordObj.word;
    const category = wordObj.categoria || wordObj.category;
    const correctAnswer = wordObj.corretta || wordObj.definizione;
    const distractors = wordObj.distrattori || wordObj.distractors;
    return (word && category && correctAnswer && distractors && Array.isArray(distractors) && distractors.length >= 3);
};

// Estrae l'array JSON dalla risposta testuale dell'IA
const extractJsonArrayFromString = (text) => {
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        throw new Error("Nessun array JSON valido trovato nella risposta dell'IA.");
    }
    return text.substring(jsonStart, jsonEnd + 1);
};

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

            // --- NUOVA CONFIGURAZIONE PER LA CREATIVITÀ ---
            const generationConfig = {
                temperature: 1.0, // Massima creatività
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 8192,
                responseMimeType: "text/plain",
            };
            // ---------------------------------------------

            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash-latest",
                generationConfig // Applichiamo la nuova configurazione
            });

            const prompt = `
                ATTENZIONE: La tua unica funzione è generare un array JSON di 10 oggetti.
                La tua risposta DEVE iniziare con '[' e finire con ']'.
                NON includere MAI testo, spiegazioni o markdown (\`\`\`json) prima o dopo l'array.
                Ogni oggetto nell'array deve contenere le chiavi: "parola", "categoria", "corretta" (la definizione), e "distrattori" (un array di 3 stringhe).
                Le 10 parole generate devono essere uniche tra loro.
            `;

            const result = await model.generateContent(prompt);
            const rawText = result.response.text();
            
            const cleanedText = extractJsonArrayFromString(rawText);
            const gameData = JSON.parse(cleanedText);

            if (!Array.isArray(gameData) || gameData.length < 10) {
                throw new Error("L'IA non ha generato 10 domande.");
            }
            const validGameData = gameData.filter(validateWordObject);
            if (validGameData.length < 10) {
                throw new Error("Alcune domande generate dall'IA erano incomplete.");
            }
            const wordSet = new Set(validGameData.map(q => q.parola || q.word));
            if (wordSet.size < 10) {
                throw new Error("L'IA ha generato parole duplicate.");
            }

            return res.status(200).json(validGameData);

        } catch (error) {
            console.error(`Tentativo ${attempt} fallito: ${error.message}`);
            if (attempt === maxRetries) {
                return res.status(500).json({ error: "L'IA non ha fornito una partita valida dopo vari tentativi.", details: error.message });
            }
        }
    }
};
