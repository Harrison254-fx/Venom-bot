const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require('@whiskeysockets/baileys');
const yts = require('yt-search');
const pino = require('pino');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OWNER_NUMBER = process.env.OWNER_NUMBER || '';

const userWarnings = {};
const processedMessages = new Set();

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 15000,
        defaultQueryTimeoutMs: 15000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        
        if (connection === 'open') {
            console.log('\n=============================================');
            console.log('    VENOM ULTIMATE BOT ONLINE - SHENG EDITION  ');
            console.log('=============================================\n');
        } else if (connection === 'close') {
            setTimeout(connectToWhatsApp, 3000);
        }
    });

    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const { id, participants, action } = anu;
            if (action === 'add') {
                for (let num of participants) {
                    const welcomeText = 
                        `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                        `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                        `┃    『 🎉 KARIBU SANA 🎉 』\n` +
                        `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `┃ ✦⃝ @${num.split('@')[0]}\n` +
                        `┃ ⚡ Umeingia mtaa wa kibabe bro!\n` +
                        `┃ 🛡️ Zingatia sheria za kundi.\n` +
                        `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯`;
                    
                    await sock.sendMessage(id, { text: welcomeText, mentions: [num] });
                }
            }
        } catch (e) {}
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        const m = messages[0];
        if (!m || !m.message) return;

        const isFromMe = m.key.fromMe;
        const msgId = m.key.id;
        if (processedMessages.has(msgId)) return;
        processedMessages.add(msgId);
        setTimeout(() => processedMessages.delete(msgId), 10000);

        const from = m.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        const text = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '').trim();
        if (!text) return;

        setImmediate(async () => {
            try {
                const textLower = text.toLowerCase();

                const showTyping = async () => {
                    try { 
                        await sock.sendPresenceUpdate('composing', from); 
                        await delay(300);
                    } catch (e) {}
                };

                const checkIfAdminOrOwner = async () => {
                    if (isFromMe) return true;
                    const senderJid = m.key.participant || m.participant || m.key.remoteJid;
                    const senderNum = senderJid.split('@')[0].split(':')[0];

                    if (OWNER_NUMBER && senderNum === OWNER_NUMBER) return true;
                    if (!isGroup) return false;

                    try {
                        const groupMetadata = await sock.groupMetadata(from);
                        const participants = groupMetadata.participants || [];
                        const ownerJid = groupMetadata.owner || groupMetadata.subjectOwner;

                        if (ownerJid && ownerJid.includes(senderNum)) return true;

                        const senderObj = participants.find(p => p.id.includes(senderNum));
                        return senderObj?.admin === 'admin' || senderObj?.admin === 'superadmin';
                    } catch (e) {
                        return false; 
                    }
                };

                const isLink = /(https?:\/\/[^\s]+|chat\.whatsapp\.com\/[^\s]+|[a-zA-Z0-9-]+\.com[^\s]*)/gi.test(text);
                if (isGroup && isLink && !isFromMe) {
                    const senderIsAllowed = await checkIfAdminOrOwner();
                    
                    if (!senderIsAllowed) {
                        const senderJid = m.key.participant || m.participant || m.key.remoteJid;
                        const userKey = `${from}_${senderJid}`;

                        userWarnings[userKey] = (userWarnings[userKey] || 0) + 1;
                        const currentWarnings = userWarnings[userKey];

                        try { await sock.sendMessage(from, { delete: m.key }); } catch (e) {}

                        await showTyping();
                        if (currentWarnings < 2) {
                            await sock.sendMessage(from, {
                                text: `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                      `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                      `┃    『 ⚠️ LINK DETECTED ⚠️ 』\n` +
                                      `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                      `┃ ✦⃝ @${senderJid.split('@')[0]}\n` +
                                      `┃ ⛔ Link hairuhusiwi hapa!\n` +
                                      `┃ 🚨 Warning: [ ${currentWarnings} / 2 ]\n` +
                                      `┃ ⚡ Ukipost tena unagongwa red line!\n` +
                                      `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯`,
                                mentions: [senderJid]
                            });
                        } else {
                            try {
                                await sock.sendMessage(from, {
                                    text: `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                          `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                          `┃    『 🚫 AUTO KICK 🚫 』\n` +
                                          `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                          `┃ ✦⃝ @${senderJid.split('@')[0]}\n` +
                                          `┃ 🚨 Warning: [ 2 / 2 ]\n` +
                                          `┃ ⚡ Yoh 🙌🏿 umechujwa! Over & Out 👋\n` +
                                          `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯`,
                                    mentions: [senderJid]
                                });
                                await sock.groupParticipantsUpdate(from, [senderJid], 'remove');
                            } catch (err) {
                                await sock.sendMessage(from, { text: `⚠️ Hakikisha Bot ni Admin ndio amtoe uyu msee!` });
                            }
                            delete userWarnings[userKey];
                        }
                        return;
                    }
                }

                if (textLower === '.menu' || textLower === '.help') {
                    await showTyping();
                    const menuText = 
                        `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                        `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                        `┃    『 💀 BOT MENU 💀 』\n` +
                        `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `┃ 🕷️ BOT NAME : VENOM MULTI-BOT\n` +
                        `┃ ⚙️ DEV      : HARRISON ☠️\n` +
                        `┃ 🌐 STATUS   : ACTIVE ⚡\n` +
                        `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `┃ ✦⃝ \`.song <jina>\`  ➤ Find Music 🎧\n` +
                        `┃ ✦⃝ \`.tagall\` / \`.mention\` ➤ Tag All 📢\n` +
                        `┃ ✦⃝ \`.remove\` / \`.kick\` ➤ Admin Only 🚫\n` +
                        `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯`;
                    
                    await sock.sendMessage(from, { 
                        image: { url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=1000&auto=format&fit=crop' }, 
                        caption: menuText 
                    }, { quoted: m });
                    return;
                }

                if (isGroup && (textLower.startsWith('.tagall') || textLower.startsWith('.mention') || textLower.startsWith('.tag all'))) {
                    await showTyping();
                    const groupMetadata = await sock.groupMetadata(from);
                    const participants = groupMetadata.participants || [];
                    const customMsg = text.replace(/\.(tagall|mention|tag all)/i, '').trim();

                    let mentionText = `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                      `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                      `┃    『 ✦ ATTENTION EVERYONE ✦ 』\n` +
                                      `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n`;

                    if (customMsg) {
                        mentionText += `┃ 💬 *Message:* ${customMsg}\n┃ ━━━━━━━━━━━━━━━━━━━━━━━\n`;
                    }

                    let mentions = [];
                    for (let participant of participants) {
                        mentionText += `┃ ✦⃝ @${participant.id.split('@')[0]}\n`;
                        mentions.push(participant.id);
                    }

                    mentionText += `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯`;

                    await sock.sendMessage(from, { text: mentionText, mentions }, { quoted: m });
                    return;
                }

                if (isGroup && (textLower.startsWith('.remove') || textLower.startsWith('.kick'))) {
                    await showTyping();

                    const senderAllowed = await checkIfAdminOrOwner();
                    if (!senderAllowed) {
                        await sock.sendMessage(from, { 
                            text: `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                  `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                  `┃    『 ⚠️ ACCESS DENIED ⚠️ 』\n` +
                                  `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `┃ Form hii ni ya ADMINS na OWNER pekee! ⛔\n` +
                                  `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯` 
                        }, { quoted: m });
                        return;
                    }

                    let targetJid = null;
                    const mentionedJidList = m.message.extendedTextMessage?.contextInfo?.mentionedJid;
                    if (mentionedJidList && mentionedJidList.length > 0) {
                        targetJid = mentionedJidList[0];
                    } else if (m.message.extendedTextMessage?.contextInfo?.participant) {
                        targetJid = m.message.extendedTextMessage.contextInfo.participant;
                    } else {
                        const cleanNum = text.replace(/\.(kick|remove)/i, '').replace(/[^0-9]/g, '');
                        if (cleanNum.length >= 9) {
                            targetJid = `${cleanNum}@s.whatsapp.net`;
                        }
                    }

                    if (!targetJid) {
                        await sock.sendMessage(from, { 
                            text: `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                  `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                  `┃    『 ⚠️ NOTICE ⚠️ 』\n` +
                                  `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `┃ Form za ku-out msee:\n` +
                                  `┃ ✦⃝ Tag msee: \`.kick @user\`\n` +
                                  `┃ ✦⃝ Reply msg: \`.kick\`\n` +
                                  `┃ ✦⃝ Namba: \`.kick 254712345678\`\n` +
                                  `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯` 
                        }, { quoted: m });
                        return;
                    }

                    const targetNum = targetJid.split('@')[0].split(':')[0];
                    if ((OWNER_NUMBER && targetNum === OWNER_NUMBER) || targetJid.includes(sock.user.id.split(':')[0])) {
                        await sock.sendMessage(from, { 
                            text: `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                  `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                  `┃    『 🛡️ PROTECTED 🛡️ 』\n` +
                                  `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `┃ Huwezi kum-kick BOSS au BOT bwana! ❌\n` +
                                  `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯` 
                        }, { quoted: m });
                        return;
                    }

                    try {
                        await sock.sendMessage(from, { 
                            text: `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                  `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                  `┃    『 🚫 KICKED 🚫 』\n` +
                                  `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `┃ ✦⃝ @${targetJid.split('@')[0]}\n` +
                                  `┃ ⚡ Yoh 🙌🏿 umechujwa!\n` +
                                  `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯`,
                            mentions: [targetJid]
                        });

                        await sock.groupParticipantsUpdate(from, [targetJid], 'remove');
                    } catch (err) {
                        await sock.sendMessage(from, { 
                            text: `⚠️ Hakikisha Bot ni Admin kwenye hili kundi ndio amtoe uyu msee!` 
                        }, { quoted: m });
                    }
                    return;
                }

                if (textLower.startsWith('.song')) {
                    await showTyping();
                    const query = text.replace(/\.song/i, '').trim();
                    if (!query) {
                        await sock.sendMessage(from, { 
                            text: `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                  `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                  `┃    『 🎵 SEARCH 🎵 』\n` +
                                  `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `┃ Weka jina ya ngoma bana!\n` +
                                  `┃ Mfano: \`.song Diamond\` 🎧\n` +
                                  `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯` 
                        }, { quoted: m });
                        return;
                    }

                    const searchResult = await yts(query);
                    const video = searchResult?.videos?.[0];

                    if (!video) {
                        await sock.sendMessage(from, { text: `❌ Ngoma haijapatikana bro!` }, { quoted: m });
                        return;
                    }

                    const songInfo = 
                        `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                        `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                        `┃    『 🎵 MUSIC FOUND 🎵 』\n` +
                        `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `┃ 📌 Title: ${video.title}\n` +
                        `┃ ⏱️ Duration: ${video.timestamp}\n` +
                        `┃ 🎧 Artist: ${video.author.name}\n` +
                        `┃ 🔗 Link: ${video.url}\n` +
                        `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯`;

                    await sock.sendMessage(from, { 
                        image: { url: video.thumbnail }, 
                        caption: songInfo 
                    }, { quoted: m });

                    return;
                }

                const greetingRegex = /(^|\s)(wozah|hi|hello|hey|niaje|sasa|rada|mambo|vipi|awoh|yoh|sup|xup|waza|morning|evening|mamboz|habari)(\s|$|[!.,?])/i;
                if (greetingRegex.test(textLower)) {
                    await showTyping();
                    await sock.sendMessage(from, { 
                        text: `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                              `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                              `┃    『 💬 GREETINGS 💬 』\n` +
                              `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `┃ 🕷️ Rada safi mzito!\n` +
                              `┃ ⚡ Form ziko locked & ready!\n` +
                              `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯` 
                    }, { quoted: m });
                    return;
                }

                if (GEMINI_API_KEY && !isFromMe) {
                    await showTyping();
                    try {
                        const prompt = `You are a cool Kenyan replying on WhatsApp. Always reply in trendy street slang (Sheng). Keep responses short, natural, witty, and brief like a real person. User message: "${text}"`;

                        const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }]
                            })
                        });

                        const data = await apiRes.json();
                        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

                        if (replyText) {
                            const graphicAiReply = 
                                `╭━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╮\n` +
                                `┃ ✧━━━━━━ 📢 ━━━━━━✧\n` +
                                `┃    『 💬 VENOM AI 💬 』\n` +
                                `┃ ━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                `┃ ${replyText}\n` +
                                `╰━━━━━━━━━━━━༺✦༻━━━━━━━━━━━━╯`;
                            await sock.sendMessage(from, { text: graphicAiReply }, { quoted: m });
                        }
                    } catch (aiErr) {}
                }

            } catch (err) {}
        });
    });
}

connectToWhatsApp();
