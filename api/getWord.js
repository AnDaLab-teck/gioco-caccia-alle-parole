const { GoogleGenerativeAI } = require('@google/generative-ai');

// Funzione per validare e normalizzare la risposta dell'IA
const validateAndNormalizeData = (data) => {
    const word = data.parola || data.word;
    const category = data.categoria || data.category;
    const correctAnswer = data.corretta || data.definizione;
    const distractors = data.distrattori || data.distractors;

    if (!word || !category || !correctAnswer || !distractors || !Array.isArray(distractors) || distractors.length < 3) {
        // Se i dati non sono validi, lancia un errore che verrà catturato dal ciclo di tentativi
        throw new Error("Dati dall'IA incompleti o malformati.");
    }
    
    // Ritorna un oggetto normalizzato e garantito, che il gioco potrà usare senza problemi
    return {
        word: word,
        category: category,
        correct: correctAnswer,
        distractors: distractors
    };
};


module.exports = async (req, res) => {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const { difficulty, usedWords } = req.body;
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

            const prompt = `
                Sei un esperto di vocabolario italiano. Il tuo compito è generare UNA SOLA domanda per un quiz.
                La risposta DEVE essere un JSON valido. Non includere MAI markdown (\`\`\`json) o altro testo.
                Il JSON deve avere queste chiavi: "parola", "categoria", "corretta" (la definizione), e "distrattori" (un array di 3 stringhe).
                Parole da non usare: ${usedWords.join(', ')}.
                Livello: Base.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonData = JSON.parse(text);

            // Eseguiamo il nostro nuovo "Controllo Qualità"
            const normalizedData = validateAndNormalizeData(jsonData);

            // Se arriviamo qui, i dati sono perfetti. Li inviamo e usciamo dal ciclo.
            return res.status(200).json(normalizedData);

        } catch (error) {
            console.error(`Tentativo ${attempt} fallito: ${error.message}`);
            if (attempt === maxRetries) {
                // Se tutti i tentativi falliscono, inviamo un errore finale.
                return res.status(500).json({ error: "L'IA non ha fornito una risposta valida dopo vari tentativi.", details: error.message });
            }
        }
    }
};
