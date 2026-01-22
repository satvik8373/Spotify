import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  DocumentData,
  CollectionReference,
  QueryConstraint,
  DocumentReference
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Song, Album, Playlist, User } from "@/types";

// Firebase Document interface with id field
interface FirebaseDocument {
  id: string;
  [key: string]: any;
}

// Generic data service with a cache
class FirestoreService<T extends FirebaseDocument> {
  private collectionName: string;
  private cache: Map<string, T | T[]> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private cacheDuration: number = 60000; // Cache for 1 minute instead of 5
  
  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }
  
  // Get reference to collection
  protected getCollectionRef(): CollectionReference<DocumentData> {
    return collection(db, this.collectionName);
  }
  
  // Get reference to document
  protected getDocRef(id: string): DocumentReference<DocumentData> {
    return doc(db, this.collectionName, id);
  }
  
  // Get all documents
  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const cacheKey = `all_${constraints.toString()}`;
    const cachedData = this.getCachedData(cacheKey);
    
    if (cachedData && Array.isArray(cachedData)) {
      return cachedData;
    }
    
    try {
      const q = query(this.getCollectionRef(), ...constraints);
      const querySnapshot = await getDocs(q);
      const results: T[] = [];
      
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as T);
      });
      
      this.setCachedData(cacheKey, results);
      return results;
    } catch (error) {
      throw error;
    }
  }
  
  // Get document by ID
  async getById(id: string): Promise<T | null> {
    const cachedData = this.getCachedData(id);
    
    if (cachedData && !Array.isArray(cachedData)) {
      return cachedData;
    }
    
    try {
      const docSnap = await getDoc(this.getDocRef(id));
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as T;
        this.setCachedData(id, data);
        return data;
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Create document
  async create(data: Partial<T>): Promise<T> {
    try {
      const docRef = await addDoc(this.getCollectionRef(), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const newDoc = { id: docRef.id, ...data } as T;
      this.invalidateCache();
      return newDoc;
    } catch (error) {
      throw error;
    }
  }
  
  // Create document with custom ID
  async createWithId(id: string, data: Partial<T>): Promise<T> {
    try {
      await setDoc(this.getDocRef(id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const newDoc = { id, ...data } as T;
      this.invalidateCache();
      this.setCachedData(id, newDoc);
      return newDoc;
    } catch (error) {
      throw error;
    }
  }
  
  // Update document
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      // Invalidate cache before update to ensure fresh data
      this.invalidateCache();
      
      await updateDoc(this.getDocRef(id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      // Get updated document directly from Firestore (bypassing cache)
      const docSnap = await getDoc(this.getDocRef(id));
      
      if (!docSnap.exists()) {
        throw new Error(`${this.collectionName} document not found after update`);
      }
      
      const updatedDoc = { id: docSnap.id, ...docSnap.data() } as T;
      
      // Update cache with fresh data
      this.setCachedData(id, updatedDoc);
      
      return updatedDoc;
    } catch (error) {
      throw error;
    }
  }
  
  // Delete document
  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(this.getDocRef(id));
      this.invalidateCache();
      this.cache.delete(id);
    } catch (error) {
      throw error;
    }
  }
  
  // Get documents by field value
  async getByField(field: string, value: any): Promise<T[]> {
    const cacheKey = `${field}_${value}`;
    const cachedData = this.getCachedData(cacheKey);
    
    if (cachedData && Array.isArray(cachedData)) {
      return cachedData;
    }
    
    try {
      const q = query(this.getCollectionRef(), where(field, "==", value));
      const querySnapshot = await getDocs(q);
      const results: T[] = [];
      
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as T);
      });
      
      this.setCachedData(cacheKey, results);
      return results;
    } catch (error) {
      throw error;
    }
  }
  
  // Cache helpers
  private getCachedData(key: string): T | T[] | null {
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp && Date.now() - timestamp < this.cacheDuration) {
      return this.cache.get(key) || null;
    }
    return null;
  }
  
  private setCachedData(key: string, data: T | T[]): void {
    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());
  }
  
  private invalidateCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
  
  // Public method to manually invalidate cache
  public clearCache(): void {
    this.invalidateCache();
  }
}

// Extend the Song interface to include an id field
interface FirestoreSong extends Omit<Song, '_id'> {
  id: string;
}

// Extend the Album interface to include an id field
interface FirestoreAlbum extends Omit<Album, '_id'> {
  id: string;
}

// Extend the Playlist interface to include an id field
interface FirestorePlaylist extends Omit<Playlist, '_id'> {
  id: string;
}

// Extend the User interface to include an id field
interface FirestoreUser extends Omit<User, '_id'> {
  id: string;
}

// Songs service
export class SongsService extends FirestoreService<FirestoreSong> {
  constructor() {
    super('songs');
  }
  
  // Upload song file and create song document
  async uploadSong(file: File, metadata: Omit<FirestoreSong, 'id' | 'audioUrl' | 'createdAt' | 'updatedAt'>): Promise<FirestoreSong> {
    try {
      // Generate a unique filename
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `songs/${filename}`);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const audioUrl = await getDownloadURL(storageRef);
      
      // Create song document
      return await this.create({
        ...metadata,
        audioUrl
      });
    } catch (error) {
      throw error;
    }
  }
  
  // Get featured songs
  async getFeaturedSongs(): Promise<FirestoreSong[]> {
    try {
      const q = query(
        this.getCollectionRef(),
        where('featured', '==', true),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const songs: FirestoreSong[] = [];
      
      querySnapshot.forEach((doc) => {
        songs.push({ id: doc.id, ...doc.data() } as FirestoreSong);
      });
      
      return songs;
    } catch (error) {
      throw error;
    }
  }
  
  // Get trending songs
  async getTrendingSongs(): Promise<FirestoreSong[]> {
    try {
      // In a real app, you'd have a "plays" or "popularity" field to sort by
      const q = query(
        this.getCollectionRef(),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const songs: FirestoreSong[] = [];
      
      querySnapshot.forEach((doc) => {
        songs.push({ id: doc.id, ...doc.data() } as FirestoreSong);
      });
      
      return songs;
    } catch (error) {
      throw error;
    }
  }
  
  // Get songs by album
  async getSongsByAlbum(albumId: string): Promise<FirestoreSong[]> {
    return this.getByField('albumId', albumId);
  }
}

// Albums service
export class AlbumsService extends FirestoreService<FirestoreAlbum> {
  constructor() {
    super('albums');
  }
  
  // Create album with image upload
  async createAlbum(data: Omit<FirestoreAlbum, 'id' | 'imageUrl' | 'createdAt' | 'updatedAt'>, imageFile?: File): Promise<FirestoreAlbum> {
    try {
      let imageUrl;
      
      // Upload image if provided
      if (imageFile) {
        const filename = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `albums/${filename}`);
        
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // Create album document
      return await this.create({
        ...data,
        imageUrl
      });
    } catch (error) {
      throw error;
    }
  }
  
  // Get featured albums
  async getFeaturedAlbums(): Promise<FirestoreAlbum[]> {
    try {
      const q = query(
        this.getCollectionRef(),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const albums: FirestoreAlbum[] = [];
      
      querySnapshot.forEach((doc) => {
        albums.push({ id: doc.id, ...doc.data() } as FirestoreAlbum);
      });
      
      return albums;
    } catch (error) {
      throw error;
    }
  }
}

// Playlists service
export class PlaylistsService extends FirestoreService<FirestorePlaylist> {
  constructor() {
    super('playlists');
  }
  
  // Create playlist with image
  async createPlaylist(
    data: Omit<FirestorePlaylist, 'id' | 'imageUrl' | 'createdAt' | 'updatedAt'>, 
    imageFile?: File
  ): Promise<FirestorePlaylist> {
    try {
      let imageUrl;
      
      // Upload image if provided
      if (imageFile) {
        const filename = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `playlists/${filename}`);
        
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // Create playlist document
      return await this.create({
        ...data,
        imageUrl
      });
    } catch (error) {
      throw error;
    }
  }
  
  // Get user playlists
  async getUserPlaylists(userId: string): Promise<FirestorePlaylist[]> {
    try {
      const playlists = await this.getByField('createdBy.id', userId);
      return playlists;
    } catch (error) {
      throw error;
    }
  }
  
  // Get featured playlists
  async getFeaturedPlaylists(): Promise<FirestorePlaylist[]> {
    return this.getByField('featured', true);
  }
  
  // Get all public playlists
  async getPublicPlaylists(): Promise<FirestorePlaylist[]> {
    return this.getByField('isPublic', true);
  }
  
  // Add song to playlist
  async addSongToPlaylist(playlistId: string, song: FirestoreSong): Promise<FirestorePlaylist> {
    try {
      // Invalidate cache before fetching to ensure fresh data
      this.invalidateCache();
      
      const playlist = await this.getById(playlistId);
      
      if (!playlist) {
        throw new Error('Playlist not found');
      }
      
      // Check if song is already in playlist
      const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
      if (songs.some(s => (s as any).id === song.id || (s as any)._id === song.id)) {
        return playlist; // Song already in playlist
      }
      
      // Add song to playlist
      const updatedSongs = [...songs, song];
      return await this.update(playlistId, { songs: updatedSongs } as Partial<FirestorePlaylist>);
    } catch (error) {
      throw error;
    }
  }
  
  // Remove song from playlist
  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<FirestorePlaylist> {
    try {
      // Invalidate cache before fetching to ensure fresh data
      this.invalidateCache();
      
      const playlist = await this.getById(playlistId);
      
      if (!playlist) {
        throw new Error('Playlist not found');
      }
      
      // Filter out the song
      const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
      const updatedSongs = songs.filter(s => (s as any).id !== songId && (s as any)._id !== songId);
      
      // Update playlist
      return await this.update(playlistId, { songs: updatedSongs } as Partial<FirestorePlaylist>);
    } catch (error) {
      throw error;
    }
  }
}

// User service
export class UsersService extends FirestoreService<FirestoreUser> {
  constructor() {
    super('users');
  }
  

}

// Instantiate and export services
export const songsService = new SongsService();
export const albumsService = new AlbumsService();
export const playlistsService = new PlaylistsService();
export const usersService = new UsersService(); 