const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, useMemoryAuthState } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const http = require("http");
const readline = require("readline");

// 1. HTTP Server ya kupitisha ukaguzi wa Port ya Render
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Venom Ultimate Bot is running 24/7!\n");
});

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// 2. Main Bot Function with Pairing Code
async function startVenomBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        printQRInTerminal: false, // Tumezima QR code
        browser: ["Chrome (Linux)", "", ""]
    });

    // Kama bado haijaunganishwa, itatengeneza Pairing Code
    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.OWNER_NUMBER; // Hakikisha namba yako imewekwa kwenye Environment Variables za Render
        if (!phoneNumber) {
            console.log(" Tafadhali weka namba yako kwenye environment variable ya OWNER_NUMBER (mfano: 2547XXXXXXXX)");
            return;
        }
        
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber.trim());
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`=========================================`);
            codeasa = `🔑 NENSI YA KUUNGANISHA (PAIRING CODE): ${code}`;
            console.log(codeasa);
            console.log(`=========================================`);
        }, 3000);
    }

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log("Connection closed, reconnecting...");
            if (reason !== DisconnectReason.loggedOut) {
                startVenomBot();
            } else {
                console.log("Bot logged out.");
            }
        } else if (connection === "open") {
            console.log("✅ Venom Ultimate Bot imeshikana na WhatsApp rasmi!");
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startVenomBot().catch((err) => {
    console.log("Error: " + err);
});
