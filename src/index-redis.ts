import {Server} from 'socket.io';
import {createAdapter} from '@socket.io/redis-adapter';
import {createClient, RedisClientType} from 'redis';

const io = new Server();
const pubClient = createClient({url: 'redis://localhost:6379'});
const subClient = pubClient.duplicate();

const userChannel: {[key: string]: any} = [];
const userData: {[key: string]: any} = [];

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  io.on('connection', socket => {
    socket.on('userOnline', data => {
      console.log(`[${socket.id}] User "${data.id}" is online`);
      userChannel[data.id] = socket.id;
      if (userData[data.id] && userData[data.id].length > 0) {
        console.log(
          `[${socket.id}] Data sent to user "${data.id}",`,
          userData[data.id]
        );
        io.to(socket.id).emit('message', userData[data.id]);
        userData[data.id] = [];
      } else {
        console.log(
          `[${socket.id}] No remain data for user "${data.id}",`,
          userData[data.id]
        );
      }
    });
    socket.on('userOffline', data => {
      console.log(`[${socket.id}] User "${data.id}" is offline`);
      userChannel[data.id] = null;
    });
    socket.on('disconnect', reason => {
      console.log(`[${socket.id}][-] Client disconnected:,`, reason);
      for (const [userID, socketID] of Object.entries(userChannel)) {
        if (socketID === socket.id) {
          userChannel[userID] = null;
        }
      }
    });
    socket.on('message', data => {
      console.log(`[${socket.id}][m] Got client's message:`, data);
      const socketId = userChannel[data.id];
      if (socketId) {
        console.log(
          `[${socket.id}] User "${data.id}" is online, sending,`,
          data,
          'via',
          socketId
        );
        io.to(socketId).emit('message', data);
      } else {
        if (!userData[data.id]) {
          userData[data.id] = [];
        }
        userData[data.id].push(data);
        console.log(
          `[${socket.id}] User "${data.id}" is offline, store data for later,`,
          userData[data.id]
        );
      }
    });
  });
  io.listen(3000);
});
