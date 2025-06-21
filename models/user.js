const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, trim: true },
  email: { type: String, unique: true, sparse: true, trim: true },
  googleId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
