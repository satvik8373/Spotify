import { Song, Album, Playlist, User } from './index';

// Firebase Document interface with id field
export interface FirebaseDocument {
  id: string;
  [key: string]: any;
}

// Firebase-compatible Song
export interface FirestoreSong extends Omit<Song, '_id'> {
  id: string;
  title: string;
  artist: string;
  albumId: string | null;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

// Conversion helpers
export const songToFirestore = (song: Song): FirestoreSong => {
  const { _id, ...rest } = song;
  return {
    id: _id,
    ...rest
  };
};

export const firestoreToSong = (fsong: FirestoreSong): Song => {
  const { id, ...rest } = fsong;
  return {
    _id: id,
    ...rest
  };
};

// Firebase-compatible Album
export interface FirestoreAlbum extends Omit<Album, '_id' | 'songs'> {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  releaseYear: number;
  songs: FirestoreSong[];
}

// Firebase-compatible Playlist
export interface FirestorePlaylist extends Omit<Playlist, '_id' | 'songs' | 'createdBy'> {
  id: string;
  name: string;
  description: string;
  createdBy: FirestoreUser;
  songs: FirestoreSong[];
  imageUrl: string;
  isPublic: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Firebase-compatible User
export interface FirestoreUser extends Omit<User, '_id'> {
  id: string;
  _id?: string;
  uid: string;
  fullName: string;
  imageUrl: string;
} 