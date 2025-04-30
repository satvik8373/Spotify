import React, { useState, useRef, useEffect } from 'react';
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
import { useForm } from 'react-hook-form';
import { Loader2, ImageIcon } from 'lucide-react';
import { Playlist } from '@/types';
import axios from '@/lib/axios';
import { toast } from 'sonner';

// Helper function to get a default playlist image URL
const getDefaultPlaylistImage = (name: string) => {
  // In a real app, you might use a service to generate a placeholder image based on the name
  // For now, just return a static placeholder
  return '/default-playlist.jpg';
};

interface EditPlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  playlist: Playlist;
  onUpdated: (updatedPlaylist: Playlist) => void;
}

interface EditPlaylistFormData {
  name: string;
  description: string;
}

export function EditPlaylistDialog({ open, onClose, playlist, onUpdated }: EditPlaylistDialogProps) {
  const [imagePreview, setImagePreview] = useState<string>(playlist.imageUrl || getDefaultPlaylistImage(playlist.name));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EditPlaylistFormData>({
    defaultValues: {
      name: playlist.name,
      description: playlist.description || '',
    }
  });

  useEffect(() => {
    if (playlist) {
      reset({
        name: playlist.name,
        description: playlist.description || '',
      });
      setImagePreview(playlist.imageUrl || getDefaultPlaylistImage(playlist.name));
    }
  }, [playlist, reset]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

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

  const onSubmit = async (data: EditPlaylistFormData) => {
    try {
      setIsSubmitting(true);
      
      // Use the existing image URL by default
      let imageUrl = playlist.imageUrl;
      
      // If a new image was selected, in a real app we'd upload it to a server
      // Since we removed Cloudinary, we'll just use the local preview URL temporarily
      if (imageFile) {
        // In a real app, we would upload the image to a server here
        // For now, just use the preview URL (this is just a simulation)
        imageUrl = imagePreview;
      }

      // Update playlist in database
      const response = await axios.put(`/api/playlists/${playlist.id}`, {
        ...data,
        imageUrl,
      });

      onUpdated(response.data);
      
      toast.success('Playlist updated successfully!');
      
      onClose();
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Could not update the playlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogCloseHandler = () => {
    reset();
    setImageFile(null);
    setImagePreview(playlist.imageUrl || getDefaultPlaylistImage(playlist.name));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && dialogCloseHandler()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Update your playlist details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <div 
                className="relative w-40 h-40 rounded-md overflow-hidden bg-gray-100 cursor-pointer group"
                onClick={handleImageClick}
              >
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Playlist Cover" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-sm font-medium">Change Cover</span>
                </div>
                {isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                className="col-span-3"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={dialogCloseHandler}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditPlaylistDialog;
