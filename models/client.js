const { Schema, model } = require("mongoose");

const clientSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    cuit: {
        type: String,
        trim: true,
    },
    razonSocial: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
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

clientSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

module.exports = model("Client", clientSchema, "client");
