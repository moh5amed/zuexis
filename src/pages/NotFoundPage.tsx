import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-3 sm:p-6">
      <div className="text-center">
        <div className="text-4xl sm:text-6xl font-extrabold mb-3 sm:mb-4">404</div>
        <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">The page you’re looking for doesn’t exist.</p>
        <Link to="/dashboard" className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;


