import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Tone from 'tone';
import {
  ArrowLeft, Mic2, Loader2, AlertCircle,
  Volume2, VolumeX, SkipBack, Zap,
  Music2, Play, Pause, ChevronUp, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/* Helper para buscar letras */
function getActiveKaraoke(lyrics, currentTime) {
  if (!lyrics || lyrics.length === 0)
    return { segmentIdx: -1, wordIdx: -1, segment: null };

  const segmentIdx = lyrics.findIndex((seg, i) => {
    const next = lyrics[i + 1];
    return currentTime >= seg.start && (!next || currentTime < next.start);
  });

  if (segmentIdx === -1)
    return { segmentIdx: -1, wordIdx: -1, segment: null };

  const segment = lyrics[segmentIdx];
  const wordIdx = segment.words
    ? segment.words.findIndex((w, i) => {
        const nw = segment.words[i + 1];
        return currentTime >= w.start && (!nw || currentTime < nw.start);
      })
    : -1;

  return { segmentIdx, wordIdx, segment };
}

const KaraokePlayer = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [karaoke, setKaraoke] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  
  const playerRef = useRef(null);
  const pitchShiftRef = useRef(null);
  const meterRef = useRef(null);
  const requestRef = useRef();

  const [pitch, setPitch] = useState(0); 
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [isMuted,    setIsMuted]    = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(1);
  const ledRef = useRef(null);

  const [activeKaraoke, setActiveKaraoke] = useState({
    segmentIdx: -1, wordIdx: -1, segment: null,
  });

  // Limpieza total al cerrar
  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestRef.current);
      Tone.Transport.stop();
      Tone.Transport.cancel();
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
      }
      if (pitchShiftRef.current) pitchShiftRef.current.dispose();
      if (meterRef.current) meterRef.current.dispose();
    };
  }, []);

  // Carga de Audio y Configuración Profesional
  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      try {
        const data = await apiService.getKaraoke(id);
        setKaraoke(data);
        if (data.status === 'ready') {
          const audioUrl = data.instrumentalUrl || data.audioUrl;
          
          // Configuración de Calidad - Latencia mayor para evitar entrecortado
          if (Tone.getContext().latencyHint !== 'playback') {
            Tone.setContext(new Tone.Context({ latencyHint: 'playback' }));
          }
          await Tone.start();
          meterRef.current = new Tone.Meter();
          pitchShiftRef.current = new Tone.PitchShift({
            pitch: 0,
            windowSize: 0.2, // Máxima estabilidad para evitar entrecortados
            feedback: 0,
            delayTime: 0
          }).connect(meterRef.current).toDestination();
          
          playerRef.current = new Tone.Player({
            url: audioUrl,
            onload: () => {
              if (playerRef.current) {
                setDuration(playerRef.current.buffer.duration);
                setLoading(false);
                // No usamos sync() para evitar problemas de arranque silencioso
              }
            },
            onerror: (e) => {
              console.error("Tone.Player error:", e);
              setError("Error cargando el archivo de audio");
              setLoading(false);
            }
          }).connect(pitchShiftRef.current);
          
          // Forzar actualización de buffer si ya está cargado
          if (playerRef.current.buffer.loaded) {
            setDuration(playerRef.current.buffer.duration);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Load error:", err);
        setError(`Error de conexión: ${err.message}`);
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Bucle de actualización (Sincronizado con el Reloj Maestro)
  const animate = useCallback(() => {
    if (isPlaying) {
      const t = Tone.Transport.seconds;
      setCurrentTime(t);
      
      if (karaoke?.lyrics) {
        setActiveKaraoke(getActiveKaraoke(karaoke.lyrics, t));
      }

      if (meterRef.current && ledRef.current) {
        const db = meterRef.current.getValue();
        const norm = Math.max(0, (db + 60) / 60);
        // Actualización directa al DOM para evitar re-renders y entrecortados
        ledRef.current.style.backgroundColor = `rgba(255, 0, 0, ${0.3 + norm * 0.7})`;
        ledRef.current.style.boxShadow = `0 0 ${10 + norm * 20}px red`;
        ledRef.current.style.transform = `scale(${1 + norm * 0.4})`;
      }

      if (t >= duration && duration > 0) {
        stopPlayback();
      }
    } else {
      if (ledRef.current) {
        ledRef.current.style.backgroundColor = `rgba(255, 0, 0, 0.3)`;
        ledRef.current.style.boxShadow = 'none';
        ledRef.current.style.transform = 'scale(1)';
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, duration, karaoke]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  useEffect(() => {
    if (pitchShiftRef.current) {
      pitchShiftRef.current.pitch = pitch;
    }
  }, [pitch]);

  useEffect(() => {
    Tone.Destination.mute = isMuted;
  }, [isMuted]);

  const togglePlay = async () => {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      
      if (!playerRef.current || !playerRef.current.loaded) return;

      if (isPlaying) {
        playerRef.current.stop();
        Tone.Transport.pause();
        setIsPlaying(false);
      } else {
        const offset = Tone.Transport.seconds;
        playerRef.current.start(0, offset);
        Tone.Transport.start();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const stopPlayback = () => {
    if (playerRef.current) playerRef.current.stop();
    Tone.Transport.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (!playerRef.current || !playerRef.current.loaded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * duration;
    
    Tone.Transport.seconds = newTime;
    setCurrentTime(newTime);

    if (isPlaying) {
      playerRef.current.stop();
      playerRef.current.start(0, newTime);
    }
  };

  const adjustPitch = (delta) => setPitch(prev => Math.max(-12, Math.min(12, prev + delta)));
  const resetPitch = () => setPitch(0);
  const restart = () => {
    if (playerRef.current) playerRef.current.stop();
    Tone.Transport.seconds = 0;
    setCurrentTime(0);
    if (isPlaying) {
      playerRef.current.start(0, 0);
    } else {
      togglePlay();
    }
  };

  if (error) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center px-10">
      <div className="text-center max-w-md">
        <AlertCircle className="text-red-500 w-16 h-16 mx-auto mb-6" />
        <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">Error de Sistema</h2>
        <p className="text-gray-400 font-bold mb-8">{error}</p>
        <button onClick={() => navigate('/my-karaokes')} className="btn-electric w-full py-4 !rounded-2xl">
          VOLVER A MIS PISTAS
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-yellow-400 w-12 h-12 mx-auto mb-4" />
        <p className="text-white font-black uppercase tracking-widest text-[10px]">Iniciando Consola Master...</p>
      </div>
    </div>
  );

  const { segment, wordIdx } = activeKaraoke;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden select-none bg-black text-white h-screen">
      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {karaoke?.backgroundImageUrl && <img src={karaoke.backgroundImageUrl} className="w-full h-full object-cover blur-3xl" />}
      </div>

      {/* Header Flotante */}
      <header className="absolute top-0 left-0 right-0 h-24 flex items-center justify-between px-10 z-[100] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button 
          onClick={() => navigate('/my-karaokes')} 
          className="pointer-events-auto px-8 py-3 bg-yellow-400 text-black rounded-full font-black uppercase text-sm hover:scale-105 transition-all shadow-[0_0_30px_rgba(250,204,21,0.4)] flex items-center gap-2"
        >
          <ArrowLeft size={20} strokeWidth={3} /> VOLVER
        </button>
        
        <div className="text-center">
          <p className="text-[10px] text-yellow-400 font-black tracking-[0.3em] uppercase opacity-60 mb-1">Master Console Pro</p>
          <h2 className="text-lg font-black tracking-tight uppercase truncate max-w-[300px]">
            {(karaoke?.title || '').replace(/\s*[-–—]?\s*\(?\bMix\b\)?/gi, '').trim()}
          </h2>
        </div>

        <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/10 text-center backdrop-blur-md">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tono</p>
          <p className="text-2xl font-black text-white leading-none">{pitch > 0 ? `+${pitch}` : pitch}</p>
        </div>
      </header>

      {/* Letras Ultra-Grandes con Deslizamiento Central */}
      <main className="flex-grow relative z-10 px-6 flex flex-col justify-center items-center overflow-hidden">
        {/* Zona Segura: 70% del alto de la pantalla centrado para evitar solapamientos con header/footer */}
        <div className="w-full max-w-7xl h-[70vh] flex flex-col justify-center py-4">
          {[-2, -1, 0, 1, 2].map((offset) => {
            const currentIdx = activeKaraoke.segmentIdx === -1 ? 0 : activeKaraoke.segmentIdx;
            const idx = currentIdx + offset;
            const seg = karaoke?.lyrics?.[idx];
            const isActive = offset === 0 && activeKaraoke.segmentIdx !== -1;
            
            if (!seg) return <div key={offset} className="flex-1" />;

            return (
              <div key={offset} className="flex-1 flex items-center justify-center text-center py-2 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ 
                      opacity: isActive ? 1 : offset > 0 ? 0.35 : 0.05,
                      scale: isActive ? 1.1 : 1,
                      y: 0 
                    }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="w-full"
                  >
                    <p
                      className={`font-black uppercase tracking-tighter leading-none
                        ${isActive ? 'text-yellow-400 drop-shadow-[0_0_80px_rgba(250,204,21,0.6)]' : 'text-white'}`}
                      style={{
                        fontSize: isActive ? 'clamp(2.5rem, 8.5vw, 7rem)' : offset > 0 ? 'clamp(1.2rem, 3.5vw, 2.8rem)' : 'clamp(1rem, 2.2vw, 2rem)',
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                        textWrap: 'balance'
                      }}
                    >
                      {isActive ? (
                        <span className="flex flex-wrap justify-center gap-x-6">
                          {seg?.words?.map((w, i) => (
                            <span 
                              key={i}
                              style={{ 
                                color: i === wordIdx ? '#facc15' : i < wordIdx ? 'rgba(255,255,255,0.4)' : 'white',
                              }}
                            >
                              {w.word}
                            </span>
                          ))}
                        </span>
                      ) : (
                        seg?.text
                      )}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer Flotante y Compacto */}
      <footer className="absolute bottom-0 left-0 right-0 px-10 pb-10 pt-16 z-[100] bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-12 pointer-events-auto">
          <div className="flex-grow space-y-2">
             <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer relative group" onClick={handleSeek}>
                <div className="h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-150" style={{ width: `${progress}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progress}%` }} />
             </div>
             <div className="flex justify-between text-[11px] font-black tracking-widest uppercase opacity-40">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
             </div>
          </div>

          <div className="flex items-center gap-10">
            <button onClick={restart} className="opacity-40 hover:opacity-100 transition-all hover:scale-110"><SkipBack size={28}/></button>
            <button onClick={togglePlay} className="w-20 h-20 rounded-full flex items-center justify-center bg-yellow-400 text-black shadow-[0_0_50px_rgba(250,204,21,0.4)] hover:scale-110 active:scale-95 transition-all">
              {isPlaying ? <Pause size={32} fill="black" /> : <Play size={36} fill="black" className="ml-1" />}
            </button>
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10">
              <button onClick={() => adjustPitch(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronDown size={20}/></button>
              <div className="flex flex-col items-center min-w-[30px]">
                <span className="text-[9px] font-black opacity-40 uppercase">Key</span>
                <span className="text-lg font-black">{pitch}</span>
              </div>
              <button onClick={() => adjustPitch(1)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronUp size={20}/></button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default KaraokePlayer;
