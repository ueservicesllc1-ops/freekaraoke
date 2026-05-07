import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Helper: headers con token Firebase
 */
const getAuthHeaders = async () => {
  const user  = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const storageService = {
  /**
   * Sube una imagen de fondo directamente al backend (multipart/form-data).
   * El backend la guarda en B2 y devuelve la URL pública.
   * @param {File} file
   * @returns {Promise<{ publicUrl: string, remotePath: string }>}
   */
  uploadBackground: async (file) => {
    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/storage/upload-background`, {
      method: 'POST',
      headers: authHeaders,   // NO pongas Content-Type; lo pone el browser automáticamente para multipart
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Error al subir imagen (${response.status})`);
    }

    return response.json(); // { success, publicUrl, remotePath }
  },

  /**
   * Devuelve la URL pública de un archivo ya almacenado.
   * @param {string} remotePath  — ruta dentro del bucket
   */
  getFileUrl: async (remotePath) => {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/storage/url/${encodeURIComponent(remotePath)}`,
      { headers: authHeaders },
    );
    if (!response.ok) throw new Error('Error al obtener URL del archivo');
    const data = await response.json();
    return data.url;
  },
};
