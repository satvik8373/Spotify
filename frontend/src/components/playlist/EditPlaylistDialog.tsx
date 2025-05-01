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
import { Loader2, ImageIcon, Cloud, Globe, Lock } from 'lucide-react';
import { Playlist } from '@/types';
import { toast } from 'sonner';
import { uploadImage, getPlaceholderImageUrl } from '@/services/cloudinaryService';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { Switch } from '../ui/switch';

// Helper function to get a default playlist image URL
const getDefaultPlaylistImage = (name: string) => {
  // In a real app, you might use a service to generate a placeholder image based on the name
  // For now, just return a static placeholder
  return '/default-playlist.jpg';
};

interface EditPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
}

interface EditPlaylistFormData {
  name: string;
  description: string;
  isPublic: boolean;
}

export function EditPlaylistDialog({ isOpen, onClose, playlist }: EditPlaylistDialogProps) {
  const [imagePreview, setImagePreview] = useState<string>(playlist.imageUrl || getPlaceholderImageUrl(playlist.name));
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { updatePlaylist } = usePlaylistStore();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<EditPlaylistFormData>({
    defaultValues: {
      name: playlist.name,
      description: playlist.description || '',
      isPublic: playlist.isPublic !== undefined ? playlist.isPublic : true,
    }
  });

  // Watch the isPublic value to use in the UI
  const isPublic = watch('isPublic');

  useEffect(() => {
    if (playlist) {
      reset({
        name: playlist.name,
        description: playlist.description || '',
        isPublic: playlist.isPublic !== undefined ? playlist.isPublic : true,
      });
      setImagePreview(playlist.imageUrl || getPlaceholderImageUrl(playlist.name));
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

  // Test direct upload to Cloudinary
  const testDirectUpload = async () => {
    if (!imageFile) {
      toast.error('Please select an image first');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', 'spotify_clone');
      formData.append('cloud_name', 'djqq8kba8');
      formData.append('folder', 'spotify_clone/playlists');
      
      // Make direct upload request to Cloudinary
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/djqq8kba8/image/upload',
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Show success and update preview
      toast.success('Direct upload successful!');
      setImagePreview(result.secure_url);
      
      console.log('Cloudinary upload result:', result);
    } catch (error: any) {
      console.error('Direct upload error:', error);
      toast.error(`Direct upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
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
      toast.error('Failed to upload image. Using default image instead.');
      // Return a placeholder image URL on error
      return getPlaceholderImageUrl(playlist.name);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePrivacyToggle = (checked: boolean) => {
    setValue('isPublic', checked);
  };

  const onSubmit = async (data: EditPlaylistFormData) => {
    try {
      setIsSubmitting(true);
      
      // Use the existing image URL by default
      let imageUrl = playlist.imageUrl;
      
      // If a new image was selected, upload it to Cloudinary
      if (imageFile) {
        try {
          imageUrl = await uploadImageToCloudinary(imageFile);
        } catch (uploadError) {
          console.error('Upload failed, using previous image:', uploadError);
          // Continue with playlist update even if image upload fails
        }
      }

      // Get the correct ID (support both _id and id formats for compatibility)
      const playlistId = playlist._id || playlist.id;
      
      if (!playlistId) {
        throw new Error('Invalid playlist ID');
      }

      // Update playlist using the store
      await updatePlaylist(playlistId, {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        imageUrl,
      });
      
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
    setImagePreview(playlist.imageUrl || getPlaceholderImageUrl(playlist.name));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && dialogCloseHandler()}>
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
                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                    <div className="w-3/4 bg-gray-300 rounded-full h-1.5 mb-1 overflow-hidden">
                      <div 
                        className="bg-white h-1.5" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-white text-xs">{uploadProgress}%</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isSubmitting || isUploading}
              />
            </div>
            
            {/* Test direct upload button */}
            {imageFile && (
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={testDirectUpload}
                  disabled={isUploading || !imageFile}
                >
                  <Cloud className="h-3 w-3 mr-1" />
                  Test Direct Upload
                </Button>
              </div>
            )}
            
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
            
            {/* Privacy Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-2">
                  {isPublic ? (
                    <Globe className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
                <div>
                  <Label htmlFor="privacy-toggle" className="font-medium">
                    {isPublic ? 'Public' : 'Private'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isPublic 
                      ? 'Anyone can find and listen to this playlist.' 
                      : 'Only you can access this playlist.'}
                  </p>
                </div>
              </div>
              <Switch 
                id="privacy-toggle"
                checked={isPublic}
                onCheckedChange={handlePrivacyToggle}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={dialogCloseHandler}
              disabled={isSubmitting || isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
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
