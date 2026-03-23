const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Render Health Check
app.get('/health', (req, res) => res.status(200).send('Bot is running'));

let bot = null;
let jumpInterval = null;

function logToWeb(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    io.emit('console_log', message);
}

function startBot() {
    if (bot) return;

    logToWeb('Connecting to Leztusasmp.xyz as Xacrifizee_...');

    bot = mineflayer.createBot({
        host: 'Leztusasmp.xyz',
        username: 'Xacrifizee_',
        version: false // Auto-detect version
    });

    bot.on('spawn', () => {
        logToWeb('✅ Bot Spawned! Sending login...');
        bot.chat('/login "kurt"');
        io.emit('status_update', true);

        // AFK Jump Loop (5 seconds)
        if (jumpInterval) clearInterval(jumpInterval);
        jumpInterval = setInterval(() => {
            if (bot) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }
        }, 5000);
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        logToWeb(`<b style="color:#00ffcc">${username}</b>: ${message}`);
    });

    bot.on('error', (err) => {
        logToWeb(`❌ ERROR: ${err.message}`);
    });

    bot.on('end', () => {
        logToWeb('⚠️ Bot disconnected.');
        io.emit('status_update', false);
        clearInterval(jumpInterval);
        bot = null;
    });
}

function stopBot() {
    if (bot) {
        bot.quit();
        logToWeb('Disconnecting...');
    }
}

io.on('connection', (socket) => {
    // Send current status to the person who just opened the website
    socket.emit('status_update', bot !== null);

    socket.on('join', startBot);
    socket.on('leave', stopBot);
    socket.on('send_message', (msg) => {
        if (bot) {
            bot.chat(msg);
            logToWeb(`<i style="color:#3b82f6">You sent: ${msg}</i>`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Dashboard active on port ${PORT}`);
});
