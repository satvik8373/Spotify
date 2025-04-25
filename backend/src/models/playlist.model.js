import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    songs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    }],
    imageUrl: {
      type: String,
      default: 'https://res.cloudinary.com/dxjmedzrq/image/upload/v1614019708/default-playlist_ljghst.jpg'
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model('Playlist', playlistSchema); 