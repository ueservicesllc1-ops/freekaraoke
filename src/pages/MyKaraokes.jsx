import React, { useState, useEffect } from 'react';
import { Play, Clock, MoreVertical, Music, Loader2, Plus, Sparkles, ExternalLink, Zap, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';

const ProcessingStatus = ({ status, createdAt }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Si createdAt no existe aun, usamos el tiempo actual como inicio
    const start = createdAt?.seconds ? createdAt.seconds * 1000 : Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const formatTime = (seconds) => {
    if (seconds < 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="bg-black/80 backdrop-blur-3xl px-8 py-4 rounded-full border border-white/10 flex flex-col items-center gap-1 max-w-[90%] text-center">
      <div className="flex items-center gap-4">
        <Loader2 size={24} className="animate-spin text-primary flex-shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white leading-tight">
          {status.includes('...') ? status : (status === 'processing' ? 'AI RENDERING' : status)}
        </span>
      </div>
      <span className="text-[10px] font-medium text-primary/80 font-mono">
        TIEMPO: {formatTime(elapsed)}
      </span>
    </div>
  );
};

const MyKaraokes = () => {
  const [karaokes, setKaraokes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reintenta hasta 5 veces con 2s de espera — el backend Python
    // puede tardar unos segundos en arrancar junto con Vite.
    const fetchWithRetry = async (retriesLeft = 5) => {
      try {
        const data = await apiService.listKaraokes();
        setKaraokes(data);
        setLoading(false);
      } catch (err) {
        if (retriesLeft > 0) {
          await new Promise(r => setTimeout(r, 2000));
          return fetchWithRetry(retriesLeft - 1);
        }
        console.error(err);
        setError('No se pudieron cargar los karaokes.');
        setLoading(false);
      }
    };
    fetchWithRetry();
  }, []);

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta pista?')) return;

    try {
      await apiService.deleteKaraoke(id);
      setKaraokes(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center gap-8">
        <div className="relative w-24 h-24">
           <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse"></div>
           <Loader2 className="animate-spin text-primary relative z-10 w-full h-full" strokeWidth={1} />
        </div>
        <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-sm animate-pulse">Synchronizing Cloud...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-12">
        <div className="max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-primary font-black uppercase tracking-widest text-xs mb-6"
          >
            <Zap size={16} fill="currentColor" />
            <span>AI LIBRARY / STORAGE 1.2TB</span>
          </motion.div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-6 leading-none">MIS <span className="text-gradient">PISTAS</span></h1>
          <p className="text-gray-500 text-2xl font-medium">Tu colección personal de karaokes generados por IA.</p>
        </div>
        <Link 
          to="/create"
          className="btn-electric group !px-12 !py-6 !text-lg"
        >
          <Plus size={24} className="group-hover:rotate-180 transition-transform duration-500" />
          NUEVO PROYECTO
        </Link>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] text-red-400 mb-16 flex items-center gap-6 font-black text-xl"
          >
             <Music size={32} />
             {error}
          </motion.div>
        )}
      </AnimatePresence>

      {karaokes.length === 0 && !error ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-40 premium-card border-dashed"
        >
          <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-12">
             <Music className="text-gray-700" size={60} />
          </div>
          <h3 className="text-4xl font-black mb-4 tracking-tight">VACÍO POR AHORA</h3>
          <p className="text-gray-500 text-xl font-medium max-w-sm mx-auto mb-12">Tu colección de IA está lista para recibir su primera pista.</p>
          <Link to="/create" className="text-primary font-black uppercase tracking-[0.3em] text-sm hover:opacity-70 transition-opacity">
             COMENZAR CREACIÓN
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {karaokes.map((karaoke) => {
            const rawTitle = karaoke.title || '';
            let displayArtist = (karaoke.artist && !/unknown/i.test(karaoke.artist)) ? karaoke.artist : '';
            let displaySong = rawTitle;

            // Separar por guión
            const parts = rawTitle.split(/\s*[-–—]\s*/);
            if (parts.length > 1) {
              const fromTitle = parts[0].trim();
              const songPart = parts.slice(1).join(' - ').trim();
              if (!displayArtist || /unknown/i.test(displayArtist)) {
                displayArtist = fromTitle;
              }
              displaySong = songPart;
            }

            // FUNCIÓN PARA QUITAR MIX
            const stripMix = (str) => str
              .replace(/\s*[-–—]?\s*\(?\bMix\b\)?/gi, '')
              .replace(/\s{2,}/g, ' ')
              .trim();

            const cleanTitle = stripMix(displaySong).replace(/^[-–—]\s*/, '');
            const cleanArtist = stripMix(displayArtist);

            return (
            <motion.div
              key={karaoke.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative flex flex-col rounded-[1.5rem] overflow-hidden bg-[#0a0a0a] border border-white/[0.08] cursor-pointer"
              style={{ aspectRatio: '3/4' }}
            >
              {/* ── Zona imagen (parte superior) ── */}
              <div className="relative flex-1 overflow-hidden bg-zinc-900 min-h-0">
                {karaoke.backgroundImageUrl ? (
                  <img
                    src={karaoke.backgroundImageUrl}
                    alt={karaoke.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  /* Foto real de micrófono vintage */
                  <img
                    src="/mic-placeholder.png"
                    alt="Micrófono"
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  />
                )}

                {/* Botón X — esquina superior derecha */}
                <button
                  onClick={(e) => handleDelete(e, karaoke.id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/90 z-20"
                >
                  <X size={14} />
                </button>

                {/* Botón Play o procesamiento */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {karaoke.status === 'ready' ? (
                    <Link
                      to={`/player/${karaoke.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20 h-20 bg-yellow-400 text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.6)] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                    >
                      <Play size={30} fill="black" className="ml-1" />
                    </Link>
                  ) : (
                    <ProcessingStatus status={karaoke.status} createdAt={karaoke.createdAt} />
                  )}
                </div>
              </div>

              {/* ── Zona negra inferior: título grande + artista ── */}
              <div className="bg-black px-6 py-8 shrink-0 min-h-[160px] flex flex-col justify-center border-t border-white/5">
                <h3 className="font-black tracking-tighter text-3xl leading-[1.1] text-white mb-2 line-clamp-2 uppercase">
                  {cleanTitle}
                </h3>
                <p className="text-yellow-400/80 text-xl font-black tracking-tight truncate uppercase">
                  {cleanArtist}
                </p>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyKaraokes;
