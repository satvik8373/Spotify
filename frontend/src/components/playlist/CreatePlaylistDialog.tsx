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
import { ImagePlus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '@/services/cloudinaryService';
import { ContentLoading, ButtonLoading } from '@/components/ui/loading';

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePlaylistDialog({ isOpen, onClose }: CreatePlaylistDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const { createPlaylist, isCreating } = usePlaylistStore();
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);
    
    if (!file) {
      setImageError('Please select an image file');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setImageError('Please upload an image file');
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      // Upload the image to Cloudinary and track progress
      const imageUrl = await uploadImage(file, (progress) => {
        setUploadProgress(progress);
      });
      
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      toast.error('Failed to upload image');
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Validate image is uploaded
    if (!imageFile) {
      setImageError('Please upload a cover image for your playlist');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload the image to Cloudinary
      const imageUrl = await uploadImageToCloudinary(imageFile);
      
      // Create the playlist with the uploaded image URL
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
    setImagePreview('');
    setUploadProgress(0);
    setImageError(null);
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
                {isLoading || isUploading ? (
                  <div className="w-40 h-40 flex flex-col items-center justify-center bg-zinc-900 rounded-md">
                    <ContentLoading text={isUploading ? `Uploading... ${uploadProgress}%` : 'Loading...'} height="h-full" />
                  </div>
                ) : imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Playlist cover"
                    className="w-40 h-40 object-cover rounded-md shadow-md"
                  />
                ) : (
                  <div className="w-40 h-40 flex flex-col items-center justify-center bg-zinc-800 rounded-md border-2 border-dashed border-zinc-600">
                    <ImagePlus className="h-10 w-10 text-zinc-400 mb-2" />
                    <span className="text-sm text-zinc-400">Upload cover image</span>
                    <span className="text-xs text-zinc-500 mt-1">(required)</span>
                  </div>
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
                    disabled={isLoading || isUploading}
                    required
                  />
                </div>
              </div>
              {imageError && (
                <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{imageError}</span>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name" className="flex items-center">
                Name <span className="text-red-500 ml-1">*</span>
              </Label>
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
            <Button 
              type="submit" 
              disabled={!name.trim() || !imageFile || isCreating || isLoading || isUploading}
            >
              {isCreating || isLoading ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
