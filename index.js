import { createFile, getFiles, getFile } from "./fileManager.js";
import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const Events = {
  CREATE_FILE: "create-file",
  SEND_MESSAGE: "send-message",
  GET_FILES: "get-files",
  GET_USERS: "get-users",
  GET_FILE: "get-file"
}

const connectedClients = new Map();

const app = new Application();
const ip = "10.13.100.84";
const port = "1000";
const router = new Router();

function broadcast(message) {
  for (const client of connectedClients.values()) {
    client.send(message);
  }
}

function broadcastTo(client, message) {
  connectedClients.get(client).send(message);
}

function handleGetFile(username, fileName, file) {
  broadcastTo(
    username,
    JSON.stringify({
      event: Events.GET_FILE,
      fileName: fileName,
      file: file
    })
  )
}

// send updated users list to all connected clients
function broadcast_usernames() {
  const usernames = [...connectedClients.keys()];
  console.log(
    "Sending updated username list to all clients: " +
    JSON.stringify(usernames),
  );
  broadcast(
    JSON.stringify({
      event: Events.GET_USERS,
      users: usernames
    }),
  );
}

function broadcast_files(files) {
  const usernames = [...connectedClients.keys()];
  console.log(
    "Sending updated username list to all clients: " +
    JSON.stringify(usernames),
  );
  broadcast(
    JSON.stringify({
      event: Events.GET_FILES,
      files: files
    }),
  );
}

router.get("/", async (ctx) => {
  const socket = await ctx.upgrade();
  const username = ctx.request.url.searchParams.get("username");
  if (connectedClients.has(username)) {
    socket.close(1008, `Username ${username} is already taken`);
    return;
  }
  socket.username = username;
  connectedClients.set(username, socket);
  console.log(`New client connected: ${username}`);

  // broadcast the active users list when a new user logs in
  socket.onopen = () => {
    broadcast_usernames();
  };

  // when a client disconnects, remove them from the connected clients list
  // and broadcast the active users list
  socket.onclose = () => {
    console.log(`Client ${socket.username} disconnected`);
    connectedClients.delete(socket.username);
    broadcast_usernames();
  };

  // broadcast new message if someone sent one
  socket.onmessage = (m) => handleMessage(socket, m);
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (context) => {
  await context.send({
    root: `${Deno.cwd()}/`,
    index: "public/index.html",
  });
});


async function handleMessage(socket, m) {
  const data = JSON.parse(m.data);
  switch (data.event) {
    case Events.CREATE_FILE:
      createFile(socket.username, data.fileName, data.message)
      broadcast(
        JSON.stringify({
          event: Events.SEND_MESSAGE,
          data: data.message,
        }),
      );
      break;
    case Events.GET_FILES: {
      const files = await getFiles();
      console.log(files)
      broadcast_files(files);
    };
      break;
    case Events.GET_USERS: {
      broadcast_usernames();
    };
      break;
    case Events.GET_FILE: {
      const file = await getFile(data.fileName);
      var fileNameSplited = data.fileName.split(".")[0]
      handleGetFile(data.username, fileNameSplited, file);
    };
      break;
  }
}


console.log("Listening at http://localhost:" + port);
await app.listen({ port });


