import { useState, useRef } from 'react';
import { uploadImage } from '../../services/cloudinaryService';

/**
 * Reusable image uploader component with drag-and-drop,
 * file picker, upload progress, preview, and URL fallback.
 *
 * Props:
 *   - value: current image URL string
 *   - onChange: callback(url) when image URL changes
 *   - folder: Cloudinary folder (e.g. 'ssite/officers')
 *   - label: field label text (default: 'Image')
 */
const ImageUploader = ({ value = '', onChange, folder = 'ssite', label = 'Image' }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(10);

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 200);

    const result = await uploadImage(file, folder);

    clearInterval(progressInterval);

    if (result.success) {
      setProgress(100);
      onChange(result.url);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    } else {
      setError(result.error || 'Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>

      {/* Current image preview */}
      {value && !uploading && (
        <div className="mb-3 relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="max-w-xs max-h-48 rounded-xl border-2 border-gray-200 object-cover"
            onError={(e) => {
              e.target.src = '';
              e.target.style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload area */}
      {!value && !uploading && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-700">
            {dragActive ? 'Drop image here' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP up to 10MB</p>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-blue-700">Uploading to Cloudinary...</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-blue-600 mt-2">{progress}%</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* URL fallback toggle */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {showUrlInput ? 'Hide URL input' : 'Or paste an image URL instead'}
        </button>

        {showUrlInput && (
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="mt-2 w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
