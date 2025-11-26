const mongoose = require('mongoose');

const UserModel = mongoose.model("UserModel", new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role:     {type: String, required: true},
    isApproved: { type: Boolean, default: false },
    Userid: {type: String,default: '0'},
}));

module.exports = UserModel;
