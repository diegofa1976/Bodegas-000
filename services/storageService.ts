
/**
 * Safe localStorage wrapper with error handling and size limits
 */

import { Wine, GalleryImage } from '../types';

const MAX_WINES = 50;
const MAX_GALLERY = 100;

export const storageService = {
  saveWines: (wines: Wine[]) => {
    try {
      // Strip large image data to prevent quota issues
      const strippedWines = wines.map(({ image, grapeImage, ...rest }) => ({
        ...rest,
        image: '', // Never save image data in the cache
        grapeImage: ''
      }));
      const limitedWines = strippedWines.slice(0, MAX_WINES);
      sessionStorage.setItem('kinglab_wines_cache', JSON.stringify(limitedWines));
    } catch (error) {
      console.warn('Failed to save wines to sessionStorage:', error);
      // If QuotaExceededError, clear the cache and retry once
      if (error instanceof Error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        try {
          sessionStorage.removeItem('kinglab_wines_cache');
          const strippedWines = wines.map(({ image, grapeImage, ...rest }) => ({
            ...rest,
            image: '',
            grapeImage: ''
          }));
          const limitedWines = strippedWines.slice(0, Math.floor(MAX_WINES / 2));
          sessionStorage.setItem('kinglab_wines_cache', JSON.stringify(limitedWines));
        } catch (retryError) {
          console.error('Failed to save wines even after clearing cache:', retryError);
        }
      }
    }
  },

  getWines: (): Wine[] => {
    try {
      const data = sessionStorage.getItem('kinglab_wines_cache');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read wines from sessionStorage:', error);
      return [];
    }
  },

  saveGallery: (gallery: GalleryImage[]) => {
    try {
      // Gallery items can be large due to base64 images
      const limitedGallery = gallery.slice(0, MAX_GALLERY);
      sessionStorage.setItem('kinglab_gallery_cache', JSON.stringify(limitedGallery));
    } catch (error) {
      console.warn('Failed to save gallery to sessionStorage:', error);
      if (gallery.length > 1) {
        storageService.saveGallery(gallery.slice(0, Math.floor(gallery.length / 2)));
      }
    }
  },

  getGallery: (): GalleryImage[] => {
    try {
      const data = sessionStorage.getItem('kinglab_gallery_cache');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read gallery from sessionStorage:', error);
      return [];
    }
  },

  clear: () => {
    try {
      sessionStorage.removeItem('kinglab_wines_cache');
      sessionStorage.removeItem('kinglab_gallery_cache');
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error);
    }
  }
};
