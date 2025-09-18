const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    try {
        const { difficulty, usedWords } = req.body;
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const difficultyMap = {
            1: "Base (facile, per ragazzi di 12 anni)",
            2: "Intermedio (di media difficoltà, per ragazzi di 14 anni)",
            3: "Avanzato (più difficile ma non tecnico, per ragazzi di 16 anni)"
        };

        // Usiamo il nome del modello aggiornato che sappiamo funzionare
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `
            Sei un esperto di vocabolario italiano per adolescenti.
            Il tuo unico compito è creare una domanda per un gioco a quiz chiamato "Caccia alle Parole".
            Devi generare UNA SOLA parola, la sua definizione e 3 distrattori.
            La parola non deve essere una di queste: ${usedWords.join(', ')}.
            Requisiti:
            - Livello di difficoltà: ${difficultyMap[difficulty]}.
            - Categoria: Scegli una tu tra le seguenti: Emozioni, Natura, Sport, Scienza, Cibo, Arte, Geografia.
            - La definizione deve essere chiara e concisa.
            - I 3 distrattori devono essere plausibili ma sbagliati.
            Fornisci la risposta ESCLUSIVAMENTE in formato JSON valido, senza testo introduttivo, commenti o markdown.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Pulizia del testo per assicurarsi che sia un JSON valido
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResponse = JSON.parse(cleanedText);

        res.status(200).json(jsonResponse);

    } catch (error) {
        console.error("ERRORE DETTAGLIATO DALLA FUNZIONE (Google):", error);
        res.status(500).json({ error: "Errore durante la generazione della parola con Google.", details: error.message });
    }
};
