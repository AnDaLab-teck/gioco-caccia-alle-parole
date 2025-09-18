const { GoogleGenerativeAI } = require('@google/generative-ai');

// Estrae l'array JSON dalla risposta testuale dell'IA
const extractJsonArrayFromString = (text) => {
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        throw new Error("Nessun array JSON valido trovato nella risposta dell'IA.");
    }
    return text.substring(jsonStart, jsonEnd + 1);
};

// VALIDA E TRADUCE i dati in un formato standard
const validateAndNormalizeData = (data) => {
    const normalizedData = data.map(wordObj => {
        const word = wordObj.parola || wordObj.word;
        const category = wordObj.categoria || wordObj.category;
        const correct = wordObj.corretta || wordObj.definizione;
        const distractors = wordObj.distrattori || wordObj.distractors;

        // Se un campo essenziale manca, ritorna null
        if (!word || !category || !correct || !distractors || !Array.isArray(distractors) || distractors.length < 3) {
            return null;
        }
        // Ritorna l'oggetto con le chiavi standard in inglese
        return { word, category, correct, distractors };
    }).filter(Boolean); // Rimuove eventuali oggetti null (non validi)

    return normalizedData;
};

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const generationConfig = { temperature: 1.0 };
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", generationConfig });

            const prompt = `
                ATTENZIONE: La tua unica funzione è generare un array JSON di 10 oggetti.
                La tua risposta DEVE iniziare con '[' e finire con ']'.
                NON includere MAI testo o markdown prima o dopo l'array.
                Ogni oggetto deve contenere le chiavi: "parola", "categoria", "corretta" (la definizione), e "distrattori" (un array di 3 stringhe).
                Le 10 parole generate devono essere uniche tra loro.
            `;

            const result = await model.generateContent(prompt);
            const rawText = result.response.text();
            
            const cleanedText = extractJsonArrayFromString(rawText);
            const gameData = JSON.parse(cleanedText);

            // Applichiamo la nostra nuova funzione di validazione e traduzione
            const validAndNormalizedGame = validateAndNormalizeData(gameData);

            if (validAndNormalizedGame.length < 10) {
                throw new Error(`L'IA ha fornito solo ${validAndNormalizedGame.length} domande valide.`);
            }
            
            const wordSet = new Set(validAndNormalizedGame.map(q => q.word));
            if (wordSet.size < 10) {
                throw new Error("L'IA ha generato parole duplicate.");
            }

            return res.status(200).json(validAndNormalizedGame);

        } catch (error) {
            console.error(`Tentativo ${attempt} fallito: ${error.message}`);
            if (attempt === maxRetries) {
                return res.status(500).json({ error: "L'IA non ha fornito una partita valida dopo vari tentativi.", details: error.message });
            }
        }
    }
};
