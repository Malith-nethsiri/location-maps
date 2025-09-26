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

interface ImageSummaryProps {
  reportId: number;
  maxThumbnails?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showCategories?: boolean;
}

const ImageSummary: React.FC<ImageSummaryProps> = ({
  reportId,
  maxThumbnails = 4,
  size = 'md',
  showCount = true,
  showCategories = false
}) => {
  const [images, setImages] = useState<ReportImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const categoryIcons: Record<string, string> = {
    land_views: '🏞️',
    building_exterior: '🏠',
    building_interior: '🏡',
    boundaries: '📐',
    location_maps: '🗺️'
  };

  useEffect(() => {
    loadImages();
  }, [reportId]);

  const loadImages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/reports/${reportId}/images`, {
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

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`animate-pulse bg-gray-200 rounded ${sizeClasses[size]}`}></div>
        <div className={`animate-pulse bg-gray-200 rounded ${sizeClasses[size]}`}></div>
        <div className={`animate-pulse bg-gray-200 rounded ${sizeClasses[size]}`}></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center text-gray-400">
        <svg className={`${sizeClasses[size]} mr-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm">No images</span>
      </div>
    );
  }

  const displayImages = images.slice(0, maxThumbnails);
  const remainingCount = Math.max(0, images.length - maxThumbnails);

  const categoryStats = images.reduce((stats, image) => {
    stats[image.category] = (stats[image.category] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  return (
    <div className="flex items-center space-x-2">
      {/* Thumbnail Images */}
      <div className="flex -space-x-1">
        {displayImages.map((image, index) => (
          <div
            key={image.id}
            className={`relative ${sizeClasses[size]} rounded border-2 border-white bg-gray-100 overflow-hidden`}
            style={{ zIndex: displayImages.length - index }}
            title={`${image.filename} (${image.category})`}
          >
            <img
              src={image.url}
              alt={image.caption}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Remaining count indicator */}
        {remainingCount > 0 && (
          <div
            className={`${sizeClasses[size]} rounded border-2 border-white bg-gray-100 flex items-center justify-center text-gray-600 font-medium`}
            style={{ zIndex: 0 }}
            title={`${remainingCount} more images`}
          >
            <span className="text-xs">+{remainingCount}</span>
          </div>
        )}
      </div>

      {/* Count and Categories */}
      <div className="flex items-center space-x-3">
        {showCount && (
          <span className="text-sm text-gray-600 font-medium">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </span>
        )}

        {showCategories && Object.keys(categoryStats).length > 0 && (
          <div className="flex items-center space-x-1">
            {Object.entries(categoryStats).map(([category, count]) => (
              <div
                key={category}
                className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1"
                title={`${count} ${category.replace('_', ' ')} images`}
              >
                <span className="text-xs">{categoryIcons[category] || '📷'}</span>
                <span className="text-xs font-medium text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSummary;