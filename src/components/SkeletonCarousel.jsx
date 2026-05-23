import React from 'react';

const SkeletonCarousel = () => {
  return (
    <div className="relative bg-gray-200 rounded-2xl overflow-hidden h-[400px] animate-pulse mb-12">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-8 bg-gray-300 rounded mx-auto mb-4"></div>
          <div className="w-64 h-12 bg-gray-300 rounded mx-auto mb-4"></div>
          <div className="w-48 h-20 bg-gray-300 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCarousel;