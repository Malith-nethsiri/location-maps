import React, { useState, useEffect } from 'react';

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

interface ImageGalleryProps {
  reportId: number;
  category?: string;
  maxDisplay?: number;
  showCategories?: boolean;
  compact?: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  reportId,
  category,
  maxDisplay = 12,
  showCategories = true,
  compact = false
}) => {
  const [images, setImages] = useState<ReportImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ReportImage | null>(null);

  const categoryLabels: Record<string, { name: string; icon: string }> = {
    land_views: { name: 'Land & Site Views', icon: '🏞️' },
    building_exterior: { name: 'Building Exterior', icon: '🏠' },
    building_interior: { name: 'Building Interior', icon: '🏡' },
    boundaries: { name: 'Property Boundaries', icon: '📐' },
    location_maps: { name: 'Location & Maps', icon: '🗺️' }
  };

  useEffect(() => {
    loadImages();
  }, [reportId, category]);

  const loadImages = async () => {
    try {
      setIsLoading(true);
      const params = category ? `?category=${category}` : '';
      const response = await fetch(`/api/reports/${reportId}/images${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setImages(result.data || []);
      }
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedImages = showCategories
    ? images.reduce((groups, image) => {
        const cat = image.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(image);
        return groups;
      }, {} as Record<string, ReportImage[]>)
    : { all: images };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">📷</div>
        <p>No images available</p>
        {category && (
          <p className="text-sm">
            No images found for {categoryLabels[category]?.name || category}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedImages).map(([categoryKey, categoryImages]) => {
        const displayImages = categoryImages.slice(0, maxDisplay);
        const hasMore = categoryImages.length > maxDisplay;

        return (
          <div key={categoryKey}>
            {showCategories && categoryKey !== 'all' && (
              <div className="flex items-center mb-4">
                <span className="text-lg mr-2">
                  {categoryLabels[categoryKey]?.icon || '📷'}
                </span>
                <h3 className="text-lg font-medium text-gray-900">
                  {categoryLabels[categoryKey]?.name || categoryKey}
                </h3>
                <span className="ml-2 bg-gray-100 text-gray-600 rounded-full px-2 py-1 text-sm">
                  {categoryImages.length}
                </span>
              </div>
            )}

            <div className={`grid gap-4 ${
              compact
                ? 'grid-cols-3 md:grid-cols-6'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {displayImages.map((image) => (
                <div
                  key={image.id}
                  className={`relative group bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${
                    compact ? 'aspect-square' : 'aspect-[4/3]'
                  }`}
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.url}
                    alt={image.caption}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>

                  {!compact && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
                      <p className="text-xs truncate">{image.filename}</p>
                      <p className="text-xs text-gray-300">{formatFileSize(image.file_size)}</p>
                    </div>
                  )}
                </div>
              ))}

              {hasMore && (
                <div className={`bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 ${
                  compact ? 'aspect-square' : 'aspect-[4/3]'
                }`}>
                  <div className="text-center">
                    <div className="text-2xl mb-1">+{categoryImages.length - maxDisplay}</div>
                    <div className="text-xs">more</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative bg-white rounded-lg max-w-4xl max-h-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <img
              src={selectedImage.url}
              alt={selectedImage.caption}
              className="w-full h-auto max-h-[80vh] object-contain"
            />

            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{selectedImage.filename}</h3>
                  <p className="text-sm text-gray-600">{selectedImage.caption}</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <span className="mr-2">
                      {categoryLabels[selectedImage.category]?.icon || '📷'}
                    </span>
                    <span className="mr-4">
                      {categoryLabels[selectedImage.category]?.name || selectedImage.category}
                    </span>
                    <span>{formatFileSize(selectedImage.file_size)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(selectedImage.url, '_blank')}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Open Original
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;