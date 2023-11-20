require("dotenv").config();
const express = require("express");
const app = express();
const Image = require("./models/imageModel");
const connectDB = require("./db/connect");
const session = require("express-session");
const sharp = require("sharp");
const passport = require("passport");
require("./passport-setup");
app.use(express.json());
app.use(
  session({
    secret: process.env.sessionSecret,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.get("/", (req, res) => {
  res.render("pages/index", { authenticated: req.isAuthenticated() });
});
app.get(
  "/signin",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

//! after login profile page is rendered.
app.get("/login", (req, res) => {
  console.log(req.user);
  res.render("pages/profile", {
    name: req.user?.displayName,
    email: req.user?.emails[0]?.value,
    pic: req.user?.photos[0]?.value,
  });
});
//! when google signin hit this route executes.
app.get(
  "/google/login",
  passport.authenticate("google", { failureRedirect: "/fail" }),
  (_, res) => {
    res.redirect("/login");
  }
);
//! image uplaoding to database.
app.post("/upload", async (req, res) => {
  try {
    const imageData = req.body.imageData;
    const buffer = Buffer.from(imageData.split(",")[1], "base64");
    //! adding additional functionality of converting to webp and resizing
    const resizedWebPImage = await resizeAndConvertToWebP(buffer);

    const image = new Image({
      imageData: resizedWebPImage,
      contentType: "image/webp",
    });

    const savedImage = await image.save();

    res.status(201).json({
      message: "Image uploaded successfully",
      insertedId: savedImage._id,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//! Function to resize and convert to webP
async function resizeAndConvertToWebP(buffer) {
  try {
    const resizedImage = await sharp(buffer)
      .resize({ width: 300 })
      .toFormat("webp")
      .toBuffer();

    return resizedImage;
  } catch (error) {
    console.error("Error converting to webP:", error);
    throw error;
  }
}
//! route to get all the images.
app.get("/images", async (_, res) => {
  try {
    const images = await Image.find();

    const imageDataArray = images.map((image) => {
      if (image.imageData && image.imageData instanceof Buffer) {
        const base64Data = image.imageData.toString("base64");
        const dataUrl = `data:${image.contentType};base64,${base64Data}`;
        return { dataUrl };
      }
      return null;
    });

    res.json(imageDataArray.filter(Boolean));
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// ! listening to port
app.listen(5000, async () => {
  await connectDB(); //! connect to mongodb
  console.log("listening to port 5000");
});
