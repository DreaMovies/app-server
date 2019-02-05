// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var p2p = require('socket.io-p2p-server').Server;
io.use(p2p);

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', data);
    /*{
      username: socket.username,
      message: data
    });*/
  });
  // when the client emits 'new message', this listens and executes
  socket.on('new call', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new call', data);
    /*{
      username: socket.username,
      message: data
    });*/
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
  
  socket.on('peer-msg', function (data) {
    console.log('Message from peer: %s', data)
    socket.broadcast.emit('peer-msg', data)
  });

  socket.on('peer-file', function (data) {
    console.log('File from peer: %s', data)
    socket.broadcast.emit('peer-file', data)
  });

  socket.on('go-private', function (data) {
    socket.broadcast.emit('go-private', data)
  });
  
  
  socket.on('create or join', function(room) {
        var numClients = io.sockets.clients(room).length;

        if (numClients === 0) {
            socket.join(room);
            socket.emit('created', room);
        } else if (numClients == 1) {

            io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room);
        } else {
            socket.emit('full', room);
        }
        socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
        socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

    });
});
