import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { useNavigate } from 'react-router-dom';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generate placeholder image if upload fails
const generatePlaceholderImage = (name: string): string => {
  const colors = [
    '#1DB954', '#1ED760', '#2D46B9', '#9B59B6',
    '#3498DB', '#1ABC9C', '#F1C40F', '#E74C3C'
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const letter = name.charAt(0).toUpperCase();
  
  // Generate data URL with the first letter
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect width="100%" height="100%" fill="${color}" />
      <text x="50%" y="50%" font-family="Arial" font-size="120" fill="white" text-anchor="middle" dominant-baseline="middle">${letter}</text>
    </svg>
  `)}`;
};

export function CreatePlaylistDialog({ isOpen, onClose }: CreatePlaylistDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    'https://placehold.co/400x400/1DB954/FFFFFF?text=New+Playlist'
  );
  const [isUploading, setIsUploading] = useState(false);
  const { createPlaylist, isCreating } = usePlaylistStore();
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setIsUploading(true);
    try {
      // Generate a unique filename
      const filename = `playlists/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, filename);
      
      // Upload file to Firebase storage
      await uploadBytes(storageRef, imageFile);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image: Using a placeholder instead');
      
      // Return null to indicate failure but don't block playlist creation
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Handle image upload if there's a file
    let imageUrl = null;
    if (imageFile) {
      try {
        imageUrl = await uploadImage();
      } catch (uploadError) {
        console.error('Error in image upload:', uploadError);
        // Continue with playlist creation even if image upload fails
      }
    }

    // If image upload failed or no image was provided, generate a placeholder
    if (!imageUrl) {
      imageUrl = generatePlaceholderImage(name);
      console.log('Using generated placeholder image');
    }

    const playlist = await createPlaylist(name, description, isPublic, imageUrl);
    if (playlist) {
      onClose();
      resetForm();
      // Navigate to the new playlist page
      navigate(`/playlist/${playlist._id}`);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsPublic(true);
    setImageFile(null);
    setImagePreview('https://placehold.co/400x400/1DB954/FFFFFF?text=New+Playlist');
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) resetForm();
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Playlist</DialogTitle>
          <DialogDescription>
            Create a new playlist to organize your favorite songs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center mb-4">
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Playlist cover"
                  className="w-40 h-40 object-cover rounded-md shadow-md"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                  <Label
                    htmlFor="playlist-cover"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <ImagePlus className="h-8 w-8 mb-2" />
                    <span>Choose image</span>
                  </Label>
                  <Input
                    id="playlist-cover"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Awesome Playlist"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="Add an optional description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
              <Label htmlFor="public">Make this playlist public</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating || isUploading}>
              {isCreating || isUploading ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
