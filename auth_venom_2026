const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const http = http = require("http");

// HTTP Server ya kuzuia Render Port Scan Timeout
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Venom Ultimate Bot is running 24/7!\n");
});

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

async function startVenomBot() {
    const { state, saveCreds } = await useMultiFileAuthState("sessions");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        printQRInTerminal: false,
        browser: ["Chrome (Linux)", "", ""]
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.OWNER_NUMBER;
        if (!phoneNumber) {
            console.log("Weka namba yako kwenye environment variable ya OWNER_NUMBER (mfano: 254712345678)");
            return;
        }
        
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber.trim());
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`=========================================`);
            console.log(`🔑 PAIRING CODE: ${code}`);
            console.log(`=========================================`);
        }, 4000);
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
