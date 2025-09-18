const { GoogleGenerativeAI } = require('@google/generative-ai');

// Funzione per validare e normalizzare la risposta dell'IA
const validateAndNormalizeData = (data) => {
    const word = data.parola || data.word;
    const category = data.categoria || data.category;
    const correctAnswer = data.corretta || data.definizione;
    const distractors = data.distrattori || data.distractors;

    if (!word || !category || !correctAnswer || !distractors || !Array.isArray(distractors) || distractors.length < 3) {
        throw new Error("Dati JSON incompleti.");
    }
    
    return {
        word: word,
        category: category,
        correct: correctAnswer,
        distractors: distractors
    };
};

// Estrae il JSON da una stringa di testo
const extractJsonFromString = (text) => {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        throw new Error("Nessun JSON valido trovato nella risposta dell'IA.");
    }
    
    return text.substring(jsonStart, jsonEnd + 1);
};


module.exports = async (req, res) => {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const { difficulty, usedWords } = req.body;
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

            const prompt = `
                ATTENZIONE: La tua unica funzione è generare un oggetto JSON.
                La tua risposta DEVE iniziare con '{' e finire con '}'.
                NON includere MAI testo, spiegazioni o markdown (\`\`\`json) prima o dopo l'oggetto JSON.
                Il JSON deve contenere le chiavi: "parola", "categoria", "corretta" (la definizione), e "distrattori" (un array di 3 stringhe).
                Esempio di risposta valida: {"parola": "Felicità", "categoria": "Emozioni", "corretta": "Stato di contentezza", "distrattori": ["Tristezza", "Rabbia", "Paura"]}
                Parole da non usare: ${usedWords.join(', ')}.
                Livello: Base.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const rawText = response.text();
            
            const cleanedText = extractJsonFromString(rawText);
            const jsonData = JSON.parse(cleanedText);
            const normalizedData = validateAndNormalizeData(jsonData);

            // --- NUOVA ISTRUZIONE ANTI-CACHE ---
            res.setHeader('Cache-Control', 'no-store');
            // ------------------------------------

            return res.status(200).json(normalizedData);

        } catch (error) {
            console.error(`Tentativo ${attempt} fallito: ${error.message}`);
            if (attempt === maxRetries) {
                return res.status(500).json({ error: "L'IA non ha fornito una risposta valida dopo vari tentativi.", details: error.message });
            }
            await new Promise(res => setTimeout(res, 500));
        }
    }
};
