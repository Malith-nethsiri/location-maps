import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

interface ReportImage {
  id: number;
  category: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  caption: string;
  url: string;
  created_at: string;
}

interface ImageCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxCount: number;
  required: boolean;
}

interface ImageUploadManagerProps {
  reportId: number;
  onImagesUpdate?: (images: ReportImage[]) => void;
}

const ImageUploadManager: React.FC<ImageUploadManagerProps> = ({
  reportId,
  onImagesUpdate
}) => {
  const [images, setImages] = useState<ReportImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('land_views');
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const imageCategories: ImageCategory[] = [
    {
      id: 'land_views',
      name: 'Land & Site Views',
      description: 'Overall property views, aerial shots, landscape',
      icon: '🏞️',
      maxCount: 8,
      required: true
    },
    {
      id: 'building_exterior',
      name: 'Building Exterior',
      description: 'Outside views, facades, roofing, external features',
      icon: '🏠',
      maxCount: 10,
      required: true
    },
    {
      id: 'building_interior',
      name: 'Building Interior',
      description: 'Inside rooms, finishes, fixtures, layout',
      icon: '🏡',
      maxCount: 15,
      required: false
    },
    {
      id: 'boundaries',
      name: 'Property Boundaries',
      description: 'Boundary walls, fences, markers, adjacent properties',
      icon: '📐',
      maxCount: 4,
      required: true
    },
    {
      id: 'location_maps',
      name: 'Location & Maps',
      description: 'Area maps, satellite views, location context',
      icon: '🗺️',
      maxCount: 2,
      required: false
    }
  ];

  useEffect(() => {
    loadImages();
  }, [reportId]);

  const loadImages = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/images`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setImages(result.data || []);
        onImagesUpdate?.(result.data || []);
      }
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error('Failed to load images');
    }
  };

  const handleFileUpload = async (files: FileList, category: string) => {
    if (!files.length) return;

    const categoryConfig = imageCategories.find(c => c.id === category);
    const currentCategoryImages = images.filter(img => img.category === category);

    if (currentCategoryImages.length + files.length > (categoryConfig?.maxCount || 10)) {
      toast.error(`Maximum ${categoryConfig?.maxCount} images allowed for ${categoryConfig?.name}`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('category', category);

      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/reports/${reportId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Uploaded ${files.length} images to ${categoryConfig?.name}`);
        loadImages(); // Reload to get updated list
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await fetch(`/api/reports/${reportId}/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        toast.success('Image deleted successfully');
        loadImages();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOver(category);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOver(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files, category);
    }
  }, [reportId]);

  const getCategoryImages = (categoryId: string) => {
    return images.filter(img => img.category === categoryId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Property Images
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload and organize images for different sections of the valuation report
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Total: {images.length} images
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {imageCategories.map((category) => {
              const categoryImages = getCategoryImages(category.id);
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    isSelected
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                    {categoryImages.length > 0 && (
                      <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-1 text-xs">
                        {categoryImages.length}
                      </span>
                    )}
                    {category.required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Selected Category Content */}
        <div className="p-6">
          {imageCategories.map((category) => {
            if (category.id !== selectedCategory) return null;

            const categoryImages = getCategoryImages(category.id);

            return (
              <div key={category.id}>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-medium text-gray-900">
                      {category.name}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {categoryImages.length} / {category.maxCount} images
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {category.description}
                  </p>

                  {/* Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver === category.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${
                      categoryImages.length >= category.maxCount
                        ? 'opacity-50 pointer-events-none'
                        : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, category.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, category.id)}
                  >
                    <input
                      type="file"
                      id={`upload-${category.id}`}
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFileUpload(e.target.files, category.id);
                        }
                      }}
                      disabled={isUploading || categoryImages.length >= category.maxCount}
                    />

                    <div className="flex flex-col items-center">
                      <div className="text-4xl mb-2">{category.icon}</div>
                      {categoryImages.length >= category.maxCount ? (
                        <p className="text-gray-500">
                          Maximum images reached for this category
                        </p>
                      ) : (
                        <>
                          <p className="text-gray-600 mb-2">
                            Drag and drop images here, or{' '}
                            <label
                              htmlFor={`upload-${category.id}`}
                              className="text-blue-600 hover:text-blue-500 cursor-pointer font-medium"
                            >
                              browse
                            </label>
                          </p>
                          <p className="text-xs text-gray-500">
                            Supports JPG, PNG, GIF, WebP (max 10MB each)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Images Grid */}
                {categoryImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categoryImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
                      >
                        <img
                          src={image.url}
                          alt={image.caption}
                          className="w-full h-full object-cover"
                        />

                        {/* Overlay with controls */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => window.open(image.url, '_blank')}
                              className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                              title="View full size"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteImage(image.id)}
                              className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700"
                              title="Delete image"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Image info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
                          <p className="text-xs truncate">{image.filename}</p>
                          <p className="text-xs text-gray-300">{formatFileSize(image.file_size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {categoryImages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">{category.icon}</div>
                    <p>No images uploaded for {category.name}</p>
                    {category.required && (
                      <p className="text-sm text-red-500 mt-1">
                        This category is required for the valuation report
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Uploading images...</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Image Upload Guidelines
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Required categories: Land Views, Building Exterior, Boundaries</li>
                <li>Take clear, well-lit photos from multiple angles</li>
                <li>Include reference objects for scale when possible</li>
                <li>Ensure images are relevant to the valuation report</li>
                <li>Maximum file size: 10MB per image</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadManager;