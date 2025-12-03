const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const chromeLauncher = require('chrome-launcher');
const path = require('path');

console.log('Start server.js on', path.resolve(__dirname));

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.resolve(__dirname)));
app.all('/{*any}', (req, res) => res.status(200).sendFile(`/`, { root: path.resolve(__dirname) }));

io.on('connection', (socket) => {
	console.log('Télécommande connectée');
	socket.on('command', (data) => {
		console.log('Commande vidéo reçue :', data);
		io.emit('action', data);
	});
});

const PORT = 3000;
server.listen(PORT, () => {
	console.log(`Serveur lancé sur http://localhost:${PORT}`);
});


