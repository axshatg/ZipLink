require("dotenv").config();
const express = require("express");
const shortId = require("shortid");
const createHttpError = require("http-errors");
const mongoose = require("mongoose");
const path = require("path");
const ShortUrl = require("./models/urlModel");
const qr = require("qrcode"); // Import the qrcode package

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

mongoose
  .connect(process.env.MONGO_URL, {
    dbName: "url-shortener",
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("mongoose connected 💾"))
  .catch((error) => console.log("Error connecting.."));

app.set("view engine", "ejs");

app.get("/", async (req, res, next) => {
  res.render("index");
});

app.post("/", async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      throw createHttpError.BadRequest("Provide a valid url");
    }
    const urlExists = await ShortUrl.findOne({ url });
    if (urlExists) {
      const shortUrl = `${req.headers.host}/${urlExists.shortId}`;
      const qrCodeUrl = await generateQRCode(shortUrl);
      res.render("index", {
        short_url: shortUrl,
        qr_code_url: qrCodeUrl,
      });
      return;
    }
    const shortIdValue = shortId.generate();
    const shortUrl = new ShortUrl({ url: url, shortId: shortIdValue });
    const result = await shortUrl.save();
    const qrCodeUrl = await generateQRCode(`${req.headers.host}/${shortIdValue}`);
    res.render("index", {
      short_url: `${req.headers.host}/${result.shortId}`,
      qr_code_url: qrCodeUrl,
    });
  } catch (error) {
    next(error);
  }
});


app.get("/:shortId", async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const result = await ShortUrl.findOne({ shortId });
    if (!result) {
      throw createHttpError.NotFound("Short url does not exist");
    }
    res.redirect(result.url);
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  next(createHttpError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render("index", { error: err.message });
});

app.listen(3000, () => console.log("🌏 on port 3000..."));

// Function to generate QR code
async function generateQRCode(url) {
  try {
    const qrCodeUrl = await qr.toDataURL(url);
    return qrCodeUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
}



