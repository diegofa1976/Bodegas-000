
/**
 * Safe localStorage wrapper with error handling and size limits
 */

import { Wine, GalleryImage } from '../types';

const MAX_WINES = 50;
const MAX_GALLERY = 100;

export const storageService = {
  saveWines: (wines: Wine[]) => {
    try {
      // Limit size to prevent quota issues
      const limitedWines = wines.slice(0, MAX_WINES);
      localStorage.setItem('kinglab_wines_cache', JSON.stringify(limitedWines));
    } catch (error) {
      console.warn('Failed to save wines to localStorage:', error);
    }
  },

  getWines: (): Wine[] => {
    try {
      const data = localStorage.getItem('kinglab_wines_cache');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read wines from localStorage:', error);
      return [];
    }
  },

  saveGallery: (gallery: GalleryImage[]) => {
    try {
      // Gallery items can be large due to base64 images
      const limitedGallery = gallery.slice(0, MAX_GALLERY);
      localStorage.setItem('kinglab_gallery_cache', JSON.stringify(limitedGallery));
    } catch (error) {
      console.warn('Failed to save gallery to localStorage:', error);
      if (gallery.length > 1) {
        storageService.saveGallery(gallery.slice(0, Math.floor(gallery.length / 2)));
      }
    }
  },

  getGallery: (): GalleryImage[] => {
    try {
      const data = localStorage.getItem('kinglab_gallery_cache');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read gallery from localStorage:', error);
      return [];
    }
  },

  clear: () => {
    try {
      localStorage.removeItem('kinglab_wines_cache');
      localStorage.removeItem('kinglab_gallery_cache');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
};
