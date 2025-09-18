const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // Intestazioni anti-cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const maxRetries = 3; // Impostiamo un massimo di 3 tentativi

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

            // Definiamo lo "stampo" (la funzione e il suo schema)
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
                                        category: { type: "STRING", description: "La categoria della parola." },
                                        correct: { type: "STRING", description: "La definizione corretta della parola." },
                                        distractors: {
                                            type: "ARRAY",
                                            description: "Un array di esattamente 3 definizioni sbagliate.",
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

            // Il nostro Controllo di Qualità
            if (!call || call.name !== "crea_quiz_parole" || !call.args || !Array.isArray(call.args.domande) || call.args.domande.length < 10) {
                // Se la risposta non è valida, lanciamo un errore per attivare il ciclo di tentativi
                throw new Error("L'IA non ha utilizzato lo strumento fornito in modo corretto.");
            }

            const gameData = call.args.domande;
            
            // Controllo duplicati finale
            const wordSet = new Set(gameData.map(q => q.word));
            if (wordSet.size < 10) {
                throw new Error("L'IA ha generato parole duplicate.");
            }

            // Se arriviamo qui, la partita è perfetta. La inviamo e usciamo dalla funzione.
            return res.status(200).json(gameData);

        } catch (error) {
            console.error(`Tentativo ${attempt} di ${maxRetries} fallito: ${error.message}`);
            if (attempt === maxRetries) {
                // Se tutti i tentativi falliscono, inviamo un errore finale al gioco.
                return res.status(500).json({ error: "L'IA non ha risposto correttamente dopo vari tentativi.", details: error.message });
            }
        }
    }
};
