const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
    try {
        const { difficulty, usedWords } = req.body;

        const difficultyMap = {
            1: "Base (facile, per ragazzi di 12 anni)",
            2: "Intermedio (di media difficoltà, per ragazzi di 14 anni)",
            3: "Avanzato (più difficile ma non tecnico, per ragazzi di 16 anni)"
        };

        const systemPrompt = `Sei un esperto di vocabolario italiano per adolescenti. Il tuo unico compito è creare una domanda per un gioco a quiz. Devi generare UNA SOLA parola, la sua definizione e 3 distrattori. Fornisci la risposta ESCLUSIVAMENTE in formato JSON valido, senza testo introduttivo, commenti o markdown. Il formato deve essere esattamente:
{
  "word": "La tua parola generata",
  "category": "La categoria scelta",
  "level": 1,
  "correct": "La definizione corretta",
  "distractors": ["Distrattore 1", "Distrattore 2", "Distrattore 3"]
}`;

        const userPrompt = `Genera una nuova domanda. Parole già usate (da non ripetere): ${usedWords.join(', ')}. Livello di difficoltà richiesto: ${difficultyMap[difficulty]}. Categoria a tua scelta tra: Emozioni, Natura, Sport, Scienza, Cibo, Arte, Geografia.`;

        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
        });

        const jsonResponse = JSON.parse(chatCompletion.choices[0].message.content);
        
        res.status(200).json(jsonResponse);

    } catch (error) {
        console.error("ERRORE DETTAGLIATO DALLA FUNZIONE (OpenAI):", error);
        res.status(500).json({ error: "Errore durante la generazione della parola con OpenAI.", details: error.message });
    }
};
