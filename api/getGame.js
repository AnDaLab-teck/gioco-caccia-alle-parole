const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- NUOVO PARSER: L'INGEGNERE CHE LEGGE IL TESTO ---
const parseGameText = (text) => {
    const questions = [];
    const blocks = text.split('---').map(b => b.trim()).filter(Boolean);

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim());
        const question = {};

        lines.forEach(line => {
            if (line.startsWith('Parola:')) {
                question.word = line.substring(7).trim();
            } else if (line.startsWith('Categoria:')) {
                question.category = line.substring(10).trim();
            } else if (line.startsWith('Definizione Corretta:')) {
                question.correct = line.substring(20).trim();
            } else if (line.startsWith('Distrattore 1:')) {
                question.distractors = question.distractors || [];
                question.distractors.push(line.substring(14).trim());
            } else if (line.startsWith('Distrattore 2:')) {
                question.distractors = question.distractors || [];
                question.distractors.push(line.substring(14).trim());
            } else if (line.startsWith('Distrattore 3:')) {
                question.distractors = question.distractors || [];
                question.distractors.push(line.substring(14).trim());
            }
        });
        
        // Controllo di qualità sul singolo oggetto
        if (question.word && question.category && question.correct && question.distractors && question.distractors.length === 3) {
            questions.push(question);
        }
    }
    return questions;
};


module.exports = async (req, res) => {
    // Intestazioni anti-cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // 1. Chiediamo all'IA di fare un compito semplice: scrivere una lista.
        const prompt = `
            Genera 10 domande uniche per un quiz di vocabolario.
            Usa ESATTAMENTE questo formato per ogni domanda, separando ogni blocco con "---":

            Parola: [La parola]
            Categoria: [La categoria]
            Definizione Corretta: [La definizione giusta]
            Distrattore 1: [La prima definizione sbagliata]
            Distrattore 2: [La seconda definizione sbagliata]
            Distrattore 3: [La terza definizione sbagliata]
            ---
        `;

        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        
        // 2. Il nostro "ingegnere" (parser) converte il testo in JSON perfetto.
        const gameData = parseGameText(rawText);

        // 3. Controllo di qualità finale
        if (gameData.length < 10) {
            throw new Error(`L'IA ha fornito solo ${gameData.length} domande complete. Impossibile iniziare la partita.`);
        }
        
        // 4. Inviamo al gioco dati perfetti e garantiti.
        return res.status(200).json(gameData);

    } catch (error) {
        console.error("Errore critico nella generazione della partita:", error);
        return res.status(500).json({ error: "L'IA non ha fornito una risposta utilizzabile.", details: error.message });
    }
};
