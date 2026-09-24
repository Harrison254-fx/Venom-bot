const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Chrome"),
        auth: state
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Weka namba yako ya WhatsApp (mfano 2557XXXXXXXX): ');
        let code = await sock.requestPairingCode(phoneNumber.trim());
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n=== PAIRING CODE YAKO NI: ${code} ===\n`);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Venom-bot connected successfully via Pairing Code!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
