import { auth } from './firebase';

// URL vacía = usa el proxy de Vite automáticamente (sin puertos ni CORS)
const API_BASE_URL = '';

/**
 * Helper para obtener headers con token de autenticación
 */
const getHeaders = async () => {
  const user  = auth.currentUser;
  const token = user ? await user.getIdToken() : '';
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const apiService = {
  /**
   * Crea un nuevo karaoke y dispara el procesamiento
   */
  createAndProcessKaraoke: async (youtubeUrl, backgroundImageUrl = '') => {
    const headers = await getHeaders();

    // 1. Crear documento
    const createRes = await fetch(`${API_BASE_URL}/api/karaoke/create`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ youtubeUrl, backgroundImageUrl }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.detail || 'Error al crear el karaoke');
    }

    const { karaokeId } = await createRes.json();

    // 2. Disparar procesamiento en background
    const processRes = await fetch(`${API_BASE_URL}/api/karaoke/process`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ karaokeId }),
    });

    if (!processRes.ok) {
      throw new Error('Error al iniciar el procesamiento');
    }

    return { karaokeId };
  },

  /**
   * Lista los karaokes del usuario
   */
  listKaraokes: async () => {
    const headers  = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/karaoke/list`, { headers });
    if (!response.ok) throw new Error('Error al obtener la lista');
    return response.json();
  },

  /**
   * Obtiene detalles completos de un karaoke (incluye lyrics)
   */
  getKaraoke: async (karaokeId) => {
    const headers  = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/karaoke/${karaokeId}`, { headers });
    if (!response.ok) throw new Error('Error al obtener el karaoke');
    return response.json();
  },

  /**
   * Borra un karaoke
   */
  deleteKaraoke: async (karaokeId) => {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/karaoke/${karaokeId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Error al eliminar el karaoke');
    return response.json();
  },

  checkHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      return response.json();
    } catch {
      return { status: 'error' };
    }
  },
};
