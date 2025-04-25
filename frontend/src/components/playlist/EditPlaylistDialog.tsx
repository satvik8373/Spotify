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
import { Playlist } from '../../types';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

interface EditPlaylistDialogProps {
  playlist: Playlist;
  isOpen: boolean;
  onClose: () => void;
}

export function EditPlaylistDialog({ playlist, isOpen, onClose }: EditPlaylistDialogProps) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description);
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const [imageUrl, setImageUrl] = useState(playlist.imageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { updatePlaylist, isUpdating } = usePlaylistStore();

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
    setImageUrl(previewUrl);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setIsUploading(true);
    try {
      // Create form data for image upload
      const formData = new FormData();
      formData.append('file', imageFile);

      // Upload to the backend
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for auth
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalImageUrl = playlist.imageUrl;

    // If a new image was selected, upload it
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      }
    }

    await updatePlaylist(playlist._id, {
      name,
      description,
      isPublic,
      imageUrl: finalImageUrl,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Playlist</DialogTitle>
          <DialogDescription>Update your playlist details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center mb-4">
              <div className="relative group">
                <img
                  src={imageUrl}
                  alt={name || 'Playlist cover'}
                  className="w-40 h-40 object-cover rounded-md shadow-md"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                  <Label
                    htmlFor="cover-image"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <ImagePlus className="h-8 w-8 mb-2" />
                    <span>Choose image</span>
                  </Label>
                  <Input
                    id="cover-image"
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
            <Button type="submit" disabled={!name.trim() || isUpdating || isUploading}>
              {isUpdating || isUploading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
