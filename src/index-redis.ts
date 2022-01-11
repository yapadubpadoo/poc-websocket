import {Server} from 'socket.io';
import {createAdapter} from '@socket.io/redis-adapter';
import {createClient, RedisClientType} from 'redis';

const io = new Server();
const pubClient = createClient({url: 'redis://localhost:6379'});
const subClient = pubClient.duplicate();

const userRedis = createClient({url: 'redis://localhost:6379', database: 15});
const UserRepo = (redisClient: RedisClientType) => {
  return {
    saveChannel: async (userID: string, socketID: string) => {
      const channelKey = `${userID}-online-${socketID}`;
      return redisClient.set(channelKey, socketID);
    },
    getAssociatedChannels: async (userID: string) => {
      const channelKey = `${userID}-online-*`;
      const channels = await redisClient.keys(channelKey);
      const getChannelPromises = channels.map(ch => {
        return redisClient.get(ch);
      });
      return Promise.all(getChannelPromises);
    },
    deleteAssociatedChannel: async (socketID: string) => {
      const channelKey = `*-online-${socketID}`;
      const channels = await redisClient.keys(channelKey);
      const deleteChannelPromises = channels.map(ch => {
        return redisClient.del(ch);
      });
      return Promise.all(deleteChannelPromises);
    },
    pushData: async (userID: string, data: string) => {
      const key = `${userID}-data`;
      return redisClient.rPush(key, data);
    },
    getAllData: async (userID: string) => {
      const key = `${userID}-data`;
      return redisClient.lRange(key, 0, -1);
    },
    clearAllData: async (userID: string) => {
      const key = `${userID}-data`;
      return redisClient.del(key);
    },
  };
};

Promise.all([pubClient.connect(), subClient.connect()]).then(async () => {
  await userRedis.connect();
  const userRepo = UserRepo(userRedis as RedisClientType);
  io.adapter(createAdapter(pubClient, subClient));
  io.on('connection', async socket => {
    socket.on('userOnline', async data => {
      console.log(`[${socket.id}] User "${data.id}" is online`);
      await userRepo.saveChannel(data.id, socket.id);
      const storedMessages = await userRepo.getAllData(data.id);
      if (storedMessages.length > 0) {
        const messages = storedMessages.map(m => {
          return JSON.parse(m);
        });
        io.to(socket.id).emit('message', messages);
        console.log(`[${socket.id}] Data sent to user "${data.id}",`, messages);
        await userRepo.clearAllData(data.id);
      } else {
        console.log(`[${socket.id}] No remain data for user "${data.id}",`);
      }
    });
    socket.on('userOffline', async data => {
      console.log(`[${socket.id}] User "${data.id}" is offline`);
      await userRepo.deleteAssociatedChannel(socket.id);
    });
    socket.on('disconnect', async reason => {
      console.log(`[${socket.id}][-] Client disconnected:,`, reason);
      await userRepo.deleteAssociatedChannel(socket.id);
    });
    socket.on('message', async data => {
      console.log(`[${socket.id}][m] Got client's message:`, data);
      const sockets = await userRepo.getAssociatedChannels(data.id);
      if (sockets.length > 0) {
        for (const socketID of sockets) {
          if (socketID !== null) {
            console.log(
              `[${socket.id}] User "${data.id}" is online, sending,`,
              data,
              'via',
              socketID
            );
            io.to(socketID).emit('message', data);
          }
        }
      } else {
        userRepo.pushData(data.id, JSON.stringify(data));
        console.log(
          `[${socket.id}] User "${data.id}" is offline, store data for later,`,
          await userRepo.getAllData(data.id)
        );
      }
    });
  });
  io.listen(3000);
});
