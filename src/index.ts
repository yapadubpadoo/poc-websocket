import * as Koa from 'koa';
import * as serve from 'koa-static';
import {Server} from 'socket.io';

import * as path from 'path';
import * as http from 'http';

const app = new Koa();
// https://github.com/koajs/koa/issues/1041#issuecomment-344318977
const server = http.createServer(app.callback());
const io = new Server(server, {
  transports: ['websocket', 'polling'], // use WebSocket first, if available
});

const staticDirPath = path.join(__dirname, '..', 'static');
app.use(serve(staticDirPath));

// app.use(async ctx => {
//   ctx.body = 'Hello World';
// });

io.on('connection', socket => {
  console.log('[+] a user connected');
  socket.on('disconnect', () => {
    console.log('[-] user disconnected');
  });
  socket.on('message', msg => {
    console.log('[>] ' + msg);
    io.emit('message', msg); // also send to sender
  });
});

// app.listen(3000);
// https://github.com/koajs/koa/issues/1041#issuecomment-344318977
server.listen(3000, '0.0.0.0');
