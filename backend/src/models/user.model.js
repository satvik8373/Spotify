import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		fullName: {
			type: String,
			required: true,
		},
		imageUrl: {
			type: String,
			required: true,
		},
		clerkId: {
			type: String,
			required: true,
			unique: true,
		},
		isAdmin: {
			type: Boolean,
			default: false
		},
		role: {
			type: String,
			enum: ['user', 'admin'],
			default: 'user'
		}
	},
	{ timestamps: true } //  createdAt, updatedAt
);

export const User = mongoose.model("User", userSchema);
