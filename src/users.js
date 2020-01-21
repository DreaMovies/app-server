const users = [];
const rooms = [];

/*
 *  users: [
 *      {
 *          id: long integer,
 *          username: 'string',
 *          password: 'string',
 *          rooms: ['roomId', 'roomId', 'roomId'],
 *          avatar: 'string',
 *          status : 'string',
 *          tagline: 'string'
 *      }
 *  ]
 *  rooms: [
 *      {
 *          id: long integer,
 *          title: 'string',
 *          image: 'string',
 *          users : ['userId', 'userId', 'userId']
 *      }
 *  ]
 */

const addUser = function(new_user) {
    username = new_user.username.trim().toLowerCase();
    const rooms = new_user.rooms.forEach( function(room){
        room.trim().toLowerCase();
    });

    const existingUser = users.find( function(user) {
                                        return user.room === room && user.username === username;
                                    });

    if(!username || !room) {
        return {
            code: 'fields_empty',
            error: 'Username and room are required.'
        };
    }
    if(existingUser){
        return {
            code: 'user_exists',
            error: 'Username is taken.'
        };
    }

    const user = {
        id,
        username,
        avatar,
        status,
        rooms: [ room ],
        tagline
    };

    users.push(user);

    return { user };
};

const getUser = function(id) {
    users.find(function(user){
        user.id === id
    });
};

const getUsersInRoom = function(room) {
    users.filter( function(user){
        user.rooms.includes(room);
    });
};

const removeUser = function(id) {
    const index = users.findIndex((user) => user.id === id);

    if(index !== -1){
        return users.splice(index, 1)[0];
    }
};


const getPublicRooms = function(){
    rooms.filter( function(room){
        room.type === 'public';
    });
};

const getRoomChat = function(room){
    const room_chat = rooms.find( function(room){
        return room.id === room;
    });
    return room_chat.chat;
};



module.exports = {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom,

    getPublicRooms
};
