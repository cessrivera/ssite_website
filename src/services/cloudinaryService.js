// Cloudinary image upload service
// Uses unsigned upload with an upload preset (no API secret needed on client)

const DEFAULT_CLOUD_NAME = 'dphrxngbc';
const DEFAULT_UPLOAD_PRESET = 'site_uploads';

const pickEnv = (...keys) => {
  for (const key of keys) {
    const value = import.meta.env?.[key];
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized && !normalized.startsWith('your_')) {
        return normalized;
      }
    }
  }
  return '';
};

const CLOUD_NAME =
  pickEnv(
    'VITE_CLOUDINARY_CLOUD_NAME',
    'VITE_APP_CLOUDINARY_CLOUD_NAME',
    'REACT_APP_CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_CLOUD_NAME'
  ) ||
  DEFAULT_CLOUD_NAME;
const UPLOAD_PRESET =
  pickEnv(
    'VITE_CLOUDINARY_UPLOAD_PRESET',
    'VITE_APP_CLOUDINARY_UPLOAD_PRESET',
    'REACT_APP_CLOUDINARY_UPLOAD_PRESET',
    'CLOUDINARY_UPLOAD_PRESET'
  ) ||
  DEFAULT_UPLOAD_PRESET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload an image file to Cloudinary
 * @param {File} file - The image file to upload
 * @param {string} folder - Cloudinary folder path (e.g., 'ssite/officers', 'ssite/events')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImage = async (file, folder = 'ssite') => {
  if (!(file instanceof File)) {
    return { success: false, error: 'Please select a valid image file.' };
  }

  const presetCandidates = [...new Set([UPLOAD_PRESET, DEFAULT_UPLOAD_PRESET])].filter(Boolean);
  const folderModes = folder ? [true, false] : [false];
  let latestError = 'Upload failed. Please try again.';

  try {
    for (const preset of presetCandidates) {
      for (const withFolder of folderModes) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);
        if (withFolder) {
          formData.append('folder', folder);
        }

        const response = await fetch(UPLOAD_URL, {
          method: 'POST',
          body: formData,
        });

        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (response.ok && payload?.secure_url) {
          return {
            success: true,
            url: payload.secure_url,
            publicId: payload.public_id,
          };
        }

        const errorMessage = payload?.error?.message || `Upload failed with status ${response.status}`;
        latestError = errorMessage;

        if (!withFolder) {
          break;
        }

        const folderRejected = /folder|invalid parameter|not allowed/i.test(errorMessage);
        if (!folderRejected) {
          break;
        }
      }
    }
  } catch (error) {
    latestError = error.message || latestError;
    console.error('Cloudinary upload error:', error);
  }

  return {
    success: false,
    error: latestError,
  };
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
