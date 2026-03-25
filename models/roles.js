const { Schema, model } = require("mongoose");

const rolesSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: Boolean,
        default: true
    },
}, { 
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id?.toString();
            delete ret._id;
        }
    },
    toObject: { virtuals: true }
});

rolesSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

module.exports = model("Roles", rolesSchema, "roles");
