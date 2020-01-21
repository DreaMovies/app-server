// Setup basic express server
var express = require('express');
var path    = require('path');
var app     = express();
// Server
var server  = require('http').createServer(app);
var port    = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('Server listening at port %d', port);
});
// Socket
var io      = require('socket.io')(server);
var p2p     = require('socket.io-p2p-server').Server;
io.use(p2p);

// Routing
app.use(express.static(path.join(__dirname, 'public')));

//Todo
// Split users and rooms to separated file and add a persistent DB like MONGODB or something like that
const { addUser, removeUser, getUser, getUsersInRoom, getPublicRooms, getRoomChat } = require('./src/users');

// Chatroom
io.on('connection', (socket) => {
    // when the client emits 'add user', this listens and executes
    /* Add user to the chat
     * {
     *      username: 'JonhDoe',
     *      password: '******',
     *      rooms: [],
     *      avatar: 'https://asas.cas/avatar.png',
     *      status: 'online', // 'online', 'away', 'offline', 'busy'
     *      tagline: 'Seeing "Star wars: Rogue One"',
     * }
     */
    socket.on('user_join', ({user, room}) => {
        // we store the username in the socket session for this client
        // socket.user = user;

        const { error, user } = addUser({
            // The Id need to change for a more definitive one, like from website
            id: new Date().valueOf(),
            username: user.username,
            password: user.password,
            avatar: user.avatar,
            rooms: user.rooms,
            status: user.status,
            tagline: user.tagline,
            room: room
        });
        if(error){
            return error;
        }

        socket.join(room);
        io.to(room).emit('users_update', {
            room: room,
            users: getUsersInRoom(room)
        });
    });


    /* Needs to send the public key to maintain the chat encrypted
     * {
     *      roomId: 121112412, // send the room id, if exists, will join, if not, will create
     *      users: [
     *          {
     *              userId: 111,
     *              creator: true,
     *              admin: true,
     *              publicKey: 'asdasdasdadasda',
     *          },
     *          {
     *              userId: 316,
     *              creator: false,
     *              admin: true,
     *              publicKey: 'asdasdasdadasda',
     *          }
     *      ],
     *      type: 'public', // 'public', 'private',
     * }
     */
    socket.on('room_join', function (room) {
        console.log('create or join to room ', room);

        const myRoom = io.sockets.adapter.rooms[room] || {length: 0};
        const numClients = myRoom.length;

        console.log(room, ' has ', numClients, ' clients');

        if (numClients == 0) {
            socket.join(room);
            socket.emit('room_created', room);
        } else if (room.type == 'public') {
            socket.join(room);
            socket.emit('room_joined', room);
        } else {
            if( room.type == 'private' && room.users.length == 2) {
                socket.emit('room_full', room);
            } else {
                socket.emit('room_error', room);
            }
        }
    });

    socket.on('get_users', (room) => {
        socket.broadcast.to(room).emit('get_users', getUsersInRoom(room));
    });
    socket.on('get_rooms_list', () => {
        socket.broadcast.emit('get_rooms_list', getPublicRooms());
    });

    socket.on('get_room_chat', (room) => {
        socket.broadcast.to(room).emit('get_room_chat', getRoomChat(room));
    });


    // when the client emits 'typing', we broadcast it to others
    /*
     * {
     *      roomId: 123123
     * }
     */
    socket.on('typing', (room) => {
        socket.broadcast.to(room).emit('typing', {
            username: socket.user.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    /*
     * {
     *      roomId: 123123
     * }
     */
    socket.on('stop_typing', (room) => {
        socket.broadcast.to(room).emit('stop_typing', {
            username: socket.user.username
        });
    });

    // when the client emits 'new message', this listens and executes
    /*
     * {
     *      roomId: 123123,
     *      message: 'asdasdasd asd asd asa',
     *      seenAt: dateTime or null, // null if not seen
     *      sentAt: dateTime,
     *      sentBy: 111, // User Id
     * }
     */
    socket.on('new_message', (room, data) => {
        //TODO
        // Add message to room to have a history

        // we tell the client to execute 'new message'
        socket.broadcast.to(room).emit('new_message', data);
        /*{
          username: socket.user.username,
          message: data
        });*/
    });


    // Call related
    /* Start Call with room (one or more users)
     * {
     *      userId: 111,
     *      roomId: 192113,
     *      status: 'waiting', // 'waiting', 'ongoing', 'end', 'failed', 'rejected', 'canceled'
     *      startTime: dateTime,
     *      type: 'voice', // 'voice', 'video', 'screenShare'
     *      duration: 102, // in seconds
     * }
     */
    socket.on('send_call', function (room, content) {
        socket.broadcast.to(room).emit('send_call', content);
    });
    // Accepts Call
    // simple true or false answer (true -> accepts call, false -> rejects call)
    socket.on('call_answer', function (room, content) {
        socket.broadcast.to(room).emit('call_answer', content);
    });

    // Files related
    /* Send File
     * {
     *      file: 101010110101, // Binary code
     *      filename: 'test.txt',
     *      sentAt: date,
     *      size: '12.4mb',
     * }
     */
    socket.on('send_file', function (room, data) {
        console.log('File from peer: %s', data)
        socket.broadcast.to(room).emit('send_file', data)
    });
    // Waits for the user to accept the file to download
    // simple true or false answer
    socket.on('accept_file', function (room, answer) {
        socket.broadcast.to(room).emit('accept_file', answer);
    });


    // Video related
    /* Set ready to start player
     * {
     *      party: [
     *          {
     *              userId: 11,
     *              username: 'Jonh Doe',
     *              avatar: 'https://asasa.ca/avatar.png',
     *              ready: false,
     *          },
     *          {
     *              userId: 317,
     *              username: 'Jane Doe',
     *              avatar: 'https://asasa.ca/avatar.png',
     *              ready: true,
     *          },
     *      ]
     * }
     */
    socket.on('player_ready', (room, player) => {
        socket.broadcast.to(room).emit('player_ready', player);
    });
    /* Send pause, resume or exit command
     * {
     *      command: 'play', // 'play', 'pause', 'stop', 'volume'
     *      time: 921, // the time when the player will do the action (in seconds)
     *      volume: '90%'
     * }
     */
    socket.on('player_command', (room, command) => {
        socket.broadcast.to(room).emit('player_command', command);
    });
    /* Send content to room to start streaming
     * {
     *      links: [
     *          {
     *              url: 'https://abc.link/aaaa',
     *              torrent: 'magnet:...',
     *              quality: '720p',
     *              subtitles: [
     *                  {
     *                      lang: 'en',
     *                      link: 'link.as/en/assa.str',
     *                  }
     *              ]
     *          },
     *      ],
     *      startTime: 0, // it will be in seconds to be easier to manipulate
     *      ownerId: 11, // user id of the starter of the party
     * }
     */
    socket.on('player_content', (room, player) => {
        socket.broadcast.to(room).emit('player_content', player);
    });
    /* Check everyone status in room
     * {
     *      ping: 190, // it will be in ms
     *      uploadSpeed: 1000, // It will be in bits to compare everyone
     *      downloadSpeed: 1000, // same as above
     * }
     */
    socket.on('player_status', (room, status) => {
        socket.broadcast.to(room).emit('player_status', status);
    });


    // Server Related
    socket.on('pingServer', (room) => {
        socket.broadcast.to(room).emit('ping', 'Pong!');
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if(user) {
            user.rooms.forEach( function(room) {
                io.to(room).emit('users_update', {
                    room: room,
                    users: getUsersInRoom(room)
                })
            });
        }
    });
});
