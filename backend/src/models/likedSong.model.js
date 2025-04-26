import mongoose from "mongoose";

const likedSongSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    userType: {
      type: String,
      enum: ["google", "clerk"],
      required: true
    },
    googleId: {
      type: String,
      sparse: true
    },
    clerkId: {
      type: String,
      sparse: true
    },
    songs: [
      {
        songId: {
          type: String,
          required: true
        },
        title: {
          type: String,
          required: true
        },
        artist: {
          type: String,
          required: true
        },
        imageUrl: {
          type: String,
          required: true
        },
        audioUrl: {
          type: String,
          required: true
        },
        duration: {
          type: Number,
          default: 0
        },
        albumId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Album",
          default: null
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of userId + userType
likedSongSchema.index({ userId: 1, userType: 1 }, { unique: true });

export const LikedSong = mongoose.model("LikedSong", likedSongSchema); 