const mongoose = require("mongoose");
const connection = () => {
  console.log("connected to database");
  return mongoose.connect(process.env.mongo_uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};
module.exports = connection;
