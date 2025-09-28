const mongoose = require('mongoose');

const UserModel = mongoose.model("UserModel", new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role:     {type: String, required: true}
}));

module.exports = UserModel;


// Define Student Schema

