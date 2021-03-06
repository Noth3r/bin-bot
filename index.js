const mongoose = require("mongoose");
const line = require("@line/bot-sdk");
const express = require("express");
const dotenv = require("dotenv");
const bp = require("body-parser");
const fetch = require("node-fetch");
const delay = require("delay");
dotenv.config();
const url = process.env.URL;

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

mongoose.connect(
  process.env.DB_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log("connected to DB!");
  }
);

const app = express();
const client = new line.Client(config);

const schema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      require: true,
    },
    img: {
      type: Buffer,
    },
    message: {
      type: String,
    },
    sender: {
      type: String,
      require: true,
    },
    timestamp: {
      type: String,
      require: true,
    },
  },
  {
    timestamps: true,
  }
);

app.use("/linebot", line.middleware(config));
app.use(bp.json());
app.use(
  bp.urlencoded({
    extended: true,
  })
);

app.post("/linebot", (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.get("/gambar.jpg/:id/:i", (req, res) => {
  const id = req.params.id;
  const i = req.params.i;
  if (fs.existsSync(`gambar${id}${i}.jpg`)) {
    res.sendFile(__dirname + `/gambar${id}${i}.jpg`, async () => {
      await delay(60000);
      try {
        fs.unlinkSync(__dirname + `/gambar${id}${i}.jpg`);
      } catch (e) {}
    });
  } else {
    res.send("Gambar Sudah Terhapus dari Server");
  }
});

const randomString = (length) => {
  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyz12314567890";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

async function handleEvent(event) {
  let chatId = "";
  let timestamp = event.timestamp;
  let id = "";
  let token = event.replyToken;

  switch (event.source.type) {
    case "user":
      id = event.source.userId;
      break;
    case "group":
      id = event.source.groupId;
      break;
    case "room":
      id = event.source.roomId;
      break;
  }

  const upload = mongoose.model(`chatroom${id}`, schema);
  let userData;
  try {
    userData = await client.getProfile(event.source.userId);
  } catch (e) {
    userData = {
      displayName: "Belum Add Bot",
    };
  }
  if (event.message.type === "image") {
    chatId = event.message.id;
  }
  if (chatId) {
    const bearer = `Bearer ${config.channelAccessToken}`;
    fetch(`https://api-data.line.me/v2/bot/message/${chatId}/content?`, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain",
        Authorization: bearer,
      },
    })
      .then(async (res) => {
        const chunk = await res.buffer();
        const mantap = new upload({
          contentType: "img",
          img: chunk,
          sender: userData.displayName,
          timestamp: timestamp,
        });
        const save = await mantap.save();
      })
      .catch((e) => reject(e));
    return Promise.resolve(null);
  }

  let message = event.message.text;
  if (event.message.type === "text") {
    if (isCommand(message)) {
      let reply = await processCommand(message, id, token);
      return Promise.resolve(null);
    }
    const mantap = await new upload({
      contentType: "text",
      message: message,
      sender: userData.displayName,
      timestamp: timestamp,
    });
    const save = await mantap.save();
    return Promise.resolve(null);
  }
}

function isCommand(text) {
  text = text.toLowerCase();

  if (text === "bin tsundere mode on") return true;

  if (!text.startsWith("bin ")) return false;

  let arr = text.split(" ");
  if (arr.length > 3) return false;
  if (arr[1] === "resend") {
    if (isNaN(arr[2])) return false;
  } else {
    if (isNaN(arr[1])) return false;
  }
  return true;
}

async function processCommand(message, id, token) {
  const upload = mongoose.model(`chatroom${id}`, schema);
  const maxCmd = 69;

  if (message.toLowerCase() === "bin tsundere mode on") {
    const isi = {
      type: "text",
      text: "It's not like I wanted to follow your order or something you baka >_<",
    };
    await client.replyMessage(token, isi);
    return;
  }

  let amount = 10;
  let x = message.split(" ")[message.split(" ").length - 1];
  if (x > 0) {
    if (x > maxCmd) {
      amount = maxCmd;
    } else {
      amount = parseInt(x);
    }
  }

  let result = await upload
    .find()
    .sort({
      createdAt: -1,
    })
    .limit(amount)
    .then((items) => {
      return items;
    });

  if (result.empty) {
    return ">_<";
  }

  let reply = "";

  let text = [];
  let gambar = [];

  for (let i = result.length - 1; i > -1; i--) {
    if (result[i].contentType == "text") {
      text.push(i);
      gambar.push(-1);
    } else {
      text.push(-1);
      gambar.push(i);
    }
  }

  if (amount == 1) {
    for (let i = 0; i < result.length; i++) {
      const random = randomString(5);
      let isi;
      if (text[i] != -1) {
        let data = result[text[i]];
        reply = reply.concat(data.sender + ": " + data.message);
        isi = {
          type: "text",
          text: reply,
        };
      } else if (gambar[i] != -1) {
        let data = result[gambar[i]];
        fs.writeFileSync(`gambar${id}${random}.jpg`, data.img);
        isi = {
          type: "image",
          originalContentUrl: url + `gambar.jpg/${id}/${random}`,
          previewImageUrl: url + `gambar.jpg/${id}/${random}`,
        };
      }
      await client.replyMessage(token, isi);
    }
  } else {
    for (let i = 0; i < result.length; i++) {
      const random = randomString(5);
      if (text[i] - 1 == text[i + 1]) {
        let data = result[text[i]];
        reply = reply.concat(data.sender + ": " + data.message);
        reply = reply.concat("\n\n------------\n\n");
      } else if (
        text[i] != -1 &&
        (text[i + 1] == undefined || text[i + 1] == -1)
      ) {
        let data = result[text[i]];
        reply = reply.concat(data.sender + ": " + data.message);
        if (i != result.length - 1) {
          reply = reply.concat("\n\n------------\n\n");
        }
      } else {
        let data = result[gambar[i]];
        fs.writeFileSync(`gambar${id}${random}.jpg`, data.img);
        reply = reply.concat(
          data.sender + ": " + url + `gambar.jpg/${id}/${random}`
        );
        if (i != result.length - 1) {
          reply = reply.concat("\n\n------------\n\n");
        }
      }
    }
    if (reply) {
      const isi = {
        type: "text",
        text: reply + "\n\n------------\nGambar Akan dihapus setelah 1 menit",
      };
      await client.replyMessage(token, isi);
      reply = "";
    }
  }
  const penuh = await upload.find().sort({
    createdAt: 1,
  });

  if (penuh.length > maxCmd) {
    for (let i = 0; i < penuh.length; i++) {
      const id = penuh[i]._id;
      await upload.deleteOne({
        _id: id,
      });
      const cek = await upload.find();
      if (cek.length <= maxCmd) {
        break;
      }
    }
  }

  return;
}

app.listen(process.env.PORT);
