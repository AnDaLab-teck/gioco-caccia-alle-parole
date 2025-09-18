const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // Intestazioni anti-cache per garantire risposte sempre nuove
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // 1. Definiamo lo "stampo" (la funzione e il suo schema) che l'IA dovrà riempire
        const tools = [{
            functionDeclarations: [{
                name: "crea_quiz_parole",
                description: "Crea un set di 10 domande uniche per un gioco a quiz sul vocabolario italiano.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        domande: {
                            type: "ARRAY",
                            description: "Un array contenente esattamente 10 oggetti domanda.",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    word: { type: "STRING", description: "La parola italiana per la domanda." },
                                    category: { type: "STRING", description: "La categoria della parola (es. Natura, Emozioni)." },
                                    correct: { type: "STRING", description: "La definizione corretta della parola." },
                                    distractors: {
                                        type: "ARRAY",
                                        description: "Un array di esattamente 3 definizioni sbagliate (distrattori).",
                                        items: { type: "STRING" }
                                    }
                                },
                                required: ["word", "category", "correct", "distractors"]
                            }
                        }
                    },
                    required: ["domande"]
                }
            }]
        }];

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            tools: tools,
        });

        const prompt = "Genera una partita completa per il gioco 'Caccia alle Parole', creando 10 domande diverse e uniche. Usa la funzione 'crea_quiz_parole' per formattare la tua risposta.";
        
        const result = await model.generateContent(prompt);
        const call = result.response.functionCalls?.[0];

        // 2. Controlliamo se l'IA ha usato correttamente il nostro stampo
        if (!call || call.name !== "crea_quiz_parole" || !call.args || !Array.isArray(call.args.domande) || call.args.domande.length < 10) {
            throw new Error("L'IA non è riuscita a generare una partita valida utilizzando lo strumento fornito.");
        }

        const gameData = call.args.domande;
        
        // 3. Controllo duplicati finale per sicurezza
        const wordSet = new Set(gameData.map(q => q.word));
        if (wordSet.size < 10) {
            throw new Error("L'IA ha generato parole duplicate all'interno della partita.");
        }

        // 4. Inviamo i dati, ora garantiti per essere perfetti e standardizzati
        return res.status(200).json(gameData);

    } catch (error) {
        console.error("Errore critico nella generazione della partita:", error);
        return res.status(500).json({ error: "Si è verificato un errore interno nel generare la partita.", details: error.message });
    }
};
