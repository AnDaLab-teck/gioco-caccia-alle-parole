// ============== CODICE DI TEST DIAGNOSTICO ==============
// QUESTA VERSIONE NON USA LA CHIAVE API E NON CONTATTA GOOGLE

exports.handler = async function (event, context) {
    try {
        const parolaFinta = {
            word: "Diagnosi",
            category: "Test Finale",
            level: 1,
            correct: "La struttura del sito funziona",
            distractors: ["La chiave API funziona", "Errore nel codice", "Problema di Netlify"]
        };

        return {
            statusCode: 200,
            body: JSON.stringify(parolaFinta),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Errore critico anche nella funzione di test." }),
        };
    }
};
