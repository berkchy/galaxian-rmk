const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });

// Lobi ve oyuncu yönetimi
const lobbies = {};

function log(...args) {
    console.log('[Galaxian Server]', ...args);
}

function broadcastToLobby(lobbyId, data) {
    if (!lobbies[lobbyId]) return;
    lobbies[lobbyId].players.forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', (ws) => {
    let currentLobby = null;
    let playerId = uuidv4();
    let playerName = 'Bilinmeyen';
    let isOwner = false;

    log('Yeni bağlantı:', playerId);

    ws.on('message', (message) => {
        let msg;
        try { msg = JSON.parse(message); } catch (e) { log('Geçersiz mesaj:', message); return; }
        
        if (msg.type === 'create_lobby') {
            const lobbyId = uuidv4().slice(0, 6);
            playerName = msg.name || 'Bilinmeyen';
            lobbies[lobbyId] = {
                id: lobbyId,
                owner: playerId,
                players: []
            };
            currentLobby = lobbyId;
            isOwner = true;
            lobbies[lobbyId].players.push({ id: playerId, name: playerName, ws, state: {} });
            ws.send(JSON.stringify({ type: 'lobby_created', lobbyId, owner: true }));
            log(`Lobi oluşturuldu: ${lobbyId} | Sahibi: ${playerName} (${playerId})`);
        }
        else if (msg.type === 'join_lobby') {
            const lobbyId = msg.lobbyId;
            if (!lobbies[lobbyId]) {
                ws.send(JSON.stringify({ type: 'error', message: 'Lobi bulunamadı.' }));
                log(`Lobi bulunamadı: ${lobbyId}`);
                return;
            }
            // 4 oyuncu sınırı
            if (lobbies[lobbyId].players.length >= 4) {
                ws.send(JSON.stringify({ type: 'error', message: 'Oda dolu (maksimum 4 oyuncu).' }));
                log(`Oda dolu: ${lobbyId}`);
                return;
            }
            // Aynı isim/id ile katılım engeli
            const name = msg.name || 'Bilinmeyen';
            if (lobbies[lobbyId].players.some(p => p.id === playerId || p.name === name)) {
                ws.send(JSON.stringify({ type: 'error', message: 'Bu isim veya kullanıcı zaten lobide.' }));
                log(`Aynı isim/id ile katılım engellendi: ${name} (${playerId}) lobi: ${lobbyId}`);
                return;
            }
            currentLobby = lobbyId;
            playerName = name;
            lobbies[lobbyId].players.push({ id: playerId, name: playerName, ws, state: {} });
            ws.send(JSON.stringify({ type: 'lobby_joined', lobbyId, owner: false }));
            broadcastToLobby(lobbyId, { type: 'player_list', players: lobbies[lobbyId].players.map(p => ({ id: p.id, name: p.name })) });
            log(`Lobiye katılındı: ${playerName} (${playerId}) lobi: ${lobbyId}`);
        }
        else if (msg.type === 'start_game') {
            if (currentLobby && lobbies[currentLobby] && lobbies[currentLobby].owner === playerId) {
                broadcastToLobby(currentLobby, { type: 'game_started' });
                // Oyun başlatma logu atlanıyor (sadece lobi işlemleri loglanacak)
            }
        }
        else if (msg.type === 'player_update') {
            if (currentLobby && lobbies[currentLobby]) {
                const player = lobbies[currentLobby].players.find(p => p.id === playerId);
                if (player) player.state = msg.state;
                broadcastToLobby(currentLobby, { type: 'player_states', players: lobbies[currentLobby].players.map(p => ({ id: p.id, name: p.name, state: p.state })) });
                // Oyuncu güncelleme logu kaldırıldı
            }
        }
        else if (msg.type === 'list_lobbies') {
            const lobbyList = Object.values(lobbies).map(lobby => ({
                id: lobby.id,
                owner: (lobby.players.find(p => p.id === lobby.owner) || { name: 'Bilinmeyen' }).name,
                players: lobby.players.map(p => ({ id: p.id, name: p.name }))
            }));
            ws.send(JSON.stringify({ type: 'lobby_list', lobbies: lobbyList }));
            // Oda listesi logu atlanıyor
        }
    });

    ws.on('close', () => {
        if (currentLobby && lobbies[currentLobby]) {
            lobbies[currentLobby].players = lobbies[currentLobby].players.filter(p => p.id !== playerId);
            log(`Lobiden ayrıldı: ${playerName} (${playerId}) lobi: ${currentLobby}`);
            if (lobbies[currentLobby].players.length === 0) {
                log(`Lobi silindi: ${currentLobby}`);
                delete lobbies[currentLobby];
            } else {
                if (lobbies[currentLobby].owner === playerId) {
                    lobbies[currentLobby].owner = lobbies[currentLobby].players[0].id;
                    log(`Lobi sahibi değişti: ${currentLobby} yeni sahip: ${lobbies[currentLobby].players[0].name} (${lobbies[currentLobby].players[0].id})`);
                }
                broadcastToLobby(currentLobby, { type: 'player_list', players: lobbies[currentLobby].players.map(p => ({ id: p.id, name: p.name })) });
            }
        }
    });
});

log('WebSocket sunucusu 8080 portunda çalışıyor.'); 