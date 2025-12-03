const net = require('net');
const { spawn } = require('child_process');

const MPV_SOCKET = '/tmp/mpvsocket';
let mpvProcess = null;

// Lancer mpv avec socket IPC
function startMPV(initialVideo) {
  if (mpvProcess) mpvProcess.kill();

  mpvProcess = spawn('mpv', [
    '--fs',
    '--no-border',
    `--input-ipc-server=${MPV_SOCKET}`,
    '--loop=no',
    initialVideo
  ]);

  mpvProcess.stdout.on('data', (data) => console.log(`[mpv stdout] ${data}`));
  mpvProcess.stderr.on('data', (data) => console.error(`[mpv stderr] ${data}`));
  mpvProcess.on('close', (code) => console.log(`[mpv] exited with code ${code}`));
}

// Envoyer une commande à mpv via socket
function sendCommand(cmd) {
  const client = net.createConnection(MPV_SOCKET, () => {
    client.write(JSON.stringify(cmd));
    client.end();
  });
}

// Jouer une nouvelle vidéo instantanément
function playVideo(filePath) {
  sendCommand({ command: ['loadfile', filePath, 'replace'] });
}

// Exemple : écouter sur un port TCP pour recevoir le nom de la vidéo
const SERVER_PORT = 5000;
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const videoFile = data.toString().trim();
    console.log(`Command received: play ${videoFile}`);
    playVideo(videoFile);
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`Video control server running on port ${SERVER_PORT}`);
});

// Démarrage avec une vidéo par défaut
startMPV('JOUEUR_03.mp4');
