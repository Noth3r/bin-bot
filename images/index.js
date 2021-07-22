const express = require("express");
const fs = require('fs-extra');
const bp = require('body-parser');
const delay = require('delay');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

app.post("/post", (req, res) => {
  const id = req.body.id
  const i = req.body.i
  const buffer = Buffer.from(req.body.buffer.data)
  fs.writeFile(`gambar${id}${i}.jpg`, buffer, () => {
    res.send("OK")
  })
})

app.get("/gambar.jpg/:id/:i", (req, res) => {
  const id = req.params.id
  const i = req.params.i
  res.sendFile(__dirname + `/gambar${id}${i}.jpg`, async () => {
    await delay(300000)
    try {
    fs.unlinkSync(__dirname + `/gambar${id}${i}.jpg`)
    } catch(e) {
      
    }
  })
})

app.listen(process.env.PORT)