// Cloudinary image upload service
// Uses unsigned upload with an upload preset (no API secret needed on client)

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload an image file to Cloudinary
 * @param {File} file - The image file to upload
 * @param {string} folder - Cloudinary folder path (e.g., 'ssite/officers', 'ssite/events')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImage = async (file, folder = 'ssite') => {
  try {
    if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name_here') {
      throw new Error('Cloudinary cloud name not configured. Check your .env file.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete an image from Cloudinary (requires server-side implementation for signed requests)
 * For now, this is a placeholder - deletion should be handled via Cloudinary dashboard
 * or a Firebase Cloud Function with the API secret
 */
export const deleteImage = async (publicId) => {
  console.warn('Image deletion requires server-side implementation. PublicId:', publicId);
  return { success: false, error: 'Server-side deletion not implemented' };
};
