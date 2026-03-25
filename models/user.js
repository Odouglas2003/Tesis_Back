const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, required: true },
    iamge: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'active', 'rejected'],
        default: 'pending'
    },
    temporalToken: { 
        type: String,
        unique: true,
        sparse: true
    },
    created_at: { type: Date, default: Date.now },
    delete_at: { type: Date },
});

module.exports = model("User", userSchema, "user");