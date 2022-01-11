# poc-websocket


## Basic

Install

```bash
npm install
```

Run

```bash
./node_modules/.bin/ts-node src/index.ts
```

Access [http://localhost:3000](http://localhost:3000) and try to publish a message

You can also subscribe to the message at `ws://localhost:3000`

## Redis Example and Client Messages on Connect

Run Redis

```bash
docker-compose up
```

Run

```bash
./node_modules/.bin/ts-node src/index-redis.ts
```

Open the followings in browser

- Publisher `static/index-publisher.html`
- Subscriber `static/index-subscriber.html`

