
const http = require('http');
const io = require('socket.io')();

const PORT = process.env.PORT || 9000;
const server = http.createServer();

io.attach(server);

io.on('connection', (socket) => {
  console.log(`Socket ${socket.id} connected.`);

  socket.on('message', (data) => {
    console.log(`Socket ${socket.id} sent ${data}`);
	socket.emit('response','like hell');
  });

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected.`);
  });
});

server.listen(PORT);