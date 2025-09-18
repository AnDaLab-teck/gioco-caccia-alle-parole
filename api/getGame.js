const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // Intestazioni anti-cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const { difficulty } = req.body; // Riceve il livello di difficoltà dal gioco

        // Mappa la difficoltà in istruzioni chiare per l'IA
        const difficultyInstructions = {
            1: "Livello Semplice: usa parole comuni e concetti molto concreti (es. oggetti, animali, cibi). Le definizioni devono essere brevissime e dirette.",
            2: "Livello Medio: usa parole di uso comune ma meno frequenti (es. emozioni, azioni). Le definizioni possono essere leggermente più dettagliate.",
            3: "Livello Difficile: usa parole più complesse o astratte, ma sempre nel dominio della conoscenza generale, non tecniche (es. concetti, idee)."
        };

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const tools = [{
            functionDeclarations: [{
                name: "crea_quiz_parole",
                description: "Crea un set di 10 domande uniche per un gioco a quiz.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        domande: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    word: { type: "STRING" },
                                    category: { type: "STRING" },
                                    correct: { type: "STRING" },
                                    distractors: { type: "ARRAY", items: { type: "STRING" } }
                                },
                                required: ["word", "category", "correct", "distractors"]
                            }
                        }
                    },
                    required: ["domande"]
                }
            }]
        }];

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", tools: tools });

        const prompt = `
            Genera una partita completa di 10 domande per il gioco 'Caccia alle Parole'.
            ISTRUZIONI FONDAMENTALI:
            1.  Il target sono ragazzi con un'età mentale di 10-12 anni, potenzialmente con deficit cognitivi. Sii estremamente chiaro, semplice e diretto. Evita l'ironia, le metafore complesse e i concetti troppo astratti.
            2.  Il livello di difficoltà richiesto per questa partita è: ${difficultyInstructions[difficulty] || difficultyInstructions[2]}.
            3.  Le 10 parole devono essere uniche.
            4.  Usa la funzione 'crea_quiz_parole' per formattare la tua risposta.
        `;
        
        const result = await model.generateContent(prompt);
        const call = result.response.functionCalls?.[0];

        if (!call || call.name !== "crea_quiz_parole" || !call.args || !Array.isArray(call.args.domande) || call.args.domande.length < 10) {
            throw new Error("L'IA non è riuscita a generare una partita valida con lo strumento fornito.");
        }

        const gameData = call.args.domande;
        
        const wordSet = new Set(gameData.map(q => q.word));
        if (wordSet.size < 10) {
            throw new Error("L'IA ha generato parole duplicate.");
        }

        return res.status(200).json(gameData);

    } catch (error) {
        console.error("Errore critico nella generazione della partita:", error);
        return res.status(500).json({ error: "Si è verificato un errore interno nel generare la partita.", details: error.message });
    }
};
