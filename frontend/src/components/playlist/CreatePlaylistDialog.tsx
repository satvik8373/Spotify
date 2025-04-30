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
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePlaylistDialog({ isOpen, onClose }: CreatePlaylistDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    '/default-playlist.jpg'
  );
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Default placeholder image URL if no custom image is provided
      let imageUrl = '/default-playlist.jpg';
      
      // If there's a file selected, we would upload it but since we've removed
      // Cloudinary, we'll just use the local preview URL temporarily
      // In a real app, you'd upload this to your server storage
      if (imageFile) {
        imageUrl = imagePreview;
      }
      
      const playlist = await createPlaylist(name, description, isPublic, imageUrl);
      if (playlist) {
        toast.success("Playlist created successfully!");
        onClose();
        resetForm();
        // Navigate to the new playlist page
        navigate(`/playlist/${playlist._id}`);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsPublic(true);
    setImageFile(null);
    setImagePreview('/default-playlist.jpg');
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
                {isLoading ? (
                  <div className="w-40 h-40 flex items-center justify-center bg-zinc-900 rounded-md">
                    <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                  </div>
                ) : (
                  <img
                    src={imagePreview}
                    alt="Playlist cover"
                    className="w-40 h-40 object-cover rounded-md shadow-md"
                  />
                )}
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
            <Button type="submit" disabled={!name.trim() || isCreating || isLoading}>
              {isCreating || isLoading ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
