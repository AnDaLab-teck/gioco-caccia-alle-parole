const OpenAI = require('openai');

// Configuriamo il client per parlare con DeepSeek
const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY, // Useremo una nuova variabile d'ambiente
    baseURL: "https://api.deepseek.com" // L'indirizzo speciale di DeepSeek
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

        // Chiamiamo l'API di DeepSeek
        const chatCompletion = await deepseek.chat.completions.create({
            model: "deepseek-chat", // Il nome del modello di DeepSeek
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
        });

        const jsonResponse = JSON.parse(chatCompletion.choices[0].message.content);

        res.status(200).json(jsonResponse);

    } catch (error) {
        console.error("ERRORE DETTAGLIATO DALLA FUNZIONE (DeepSeek):", error);
        res.status(500).json({ error: "Errore durante la generazione della parola con DeepSeek.", details: error.message });
    }
};
