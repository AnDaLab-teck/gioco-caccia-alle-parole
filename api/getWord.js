const { GoogleGenerativeAI } = require('@google/generative-ai');

// Funzioni di validazione ed estrazione (invariate)
const validateAndNormalizeData = (data) => {
    const word = data.parola || data.word;
    const category = data.categoria || data.category;
    const correctAnswer = data.corretta || data.definizione;
    const distractors = data.distrattori || data.distractors;
    if (!word || !category || !correctAnswer || !distractors || !Array.isArray(distractors) || distractors.length < 3) {
        throw new Error("Dati JSON incompleti.");
    }
    return { word, category, correct: correctAnswer, distractors };
};

const extractJsonFromString = (text) => {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        throw new Error("Nessun JSON valido trovato nella risposta dell'IA.");
    }
    return text.substring(jsonStart, jsonEnd + 1);
};

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const maxRetries = 5; // Aumentiamo i tentativi per sicurezza
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const { usedWords } = req.body;
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

            const prompt = `
                ATTENZIONE: La tua unica funzione è generare un oggetto JSON.
                La tua risposta DEVE iniziare con '{' e finire con '}'.
                NON includere MAI testo o markdown prima o dopo l'oggetto JSON.
                Il JSON deve contenere le chiavi: "parola", "categoria", "corretta" (la definizione), e "distrattori" (un array di 3 stringhe).
                Parole da non usare: ${usedWords.join(', ')}.
                Livello: Base.
            `;

            const result = await model.generateContent(prompt);
            const rawText = result.response.text();
            
            const cleanedText = extractJsonFromString(rawText);
            const jsonData = JSON.parse(cleanedText);
            const normalizedData = validateAndNormalizeData(jsonData);

            // --- CONTROLLO FINALE "GUARDIA DEL CORPO" ---
            if (usedWords.includes(normalizedData.word)) {
                // Se l'IA ha ignorato le istruzioni, lanciamo un errore per forzare un nuovo tentativo.
                throw new Error(`L'IA ha ripetuto una parola già usata: ${normalizedData.word}`);
            }
            // ---------------------------------------------

            return res.status(200).json(normalizedData);

        } catch (error) {
            console.error(`Tentativo ${attempt} fallito: ${error.message}`);
            if (attempt === maxRetries) {
                return res.status(500).json({ error: "L'IA non ha fornito una risposta valida e unica dopo vari tentativi.", details: error.message });
            }
            await new Promise(res => setTimeout(res, 500));
        }
    }
};
