import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Sparkles, AlertCircle, CheckCircle2, Loader2, Zap, ArrowRight, Music2, Image as ImageIcon, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';
import { Clock } from 'lucide-react';

const ProcessingTimer = () => {
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-end">
      <span className="text-4xl md:text-6xl font-black text-primary font-mono tracking-tighter">
        {formatTime(seconds)}
      </span>
      <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] mt-1">TIEMPO IA</span>
    </div>
  );
};

const CreateKaraoke = () => {
  const navigate = useNavigate();
  const [youtubeLink, setYoutubeLink] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, error, success
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    setErrorMsg('');
    try {
      // 1. Preview local inmediata
      const reader = new FileReader();
      reader.onloadend = () => setBackgroundImage(reader.result);
      reader.readAsDataURL(file);

      // 2. Subir al backend → B2 → obtener URL pública permanente
      const { publicUrl } = await storageService.uploadBackground(file);
      setBackgroundImageUrl(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setErrorMsg(`Error al subir imagen: ${err.message}`);
      setBackgroundImage(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setBackgroundImage(null);
    setBackgroundImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    let interval;
    if (isPolling && result?.karaokeId) {
      interval = setInterval(async () => {
        try {
          const data = await apiService.getKaraoke(result.karaokeId);
          if (data.status === 'ready') {
            setResult(data);
            setIsPolling(false);
            // Redirigir automáticamente a la librería (Mis Pistas)
            setTimeout(() => {
              navigate('/my-karaokes');
            }, 2000); // 2 segundos de cortesía para que el usuario vea el mensaje de éxito
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPolling, result?.karaokeId]);

  const handleCreateKaraoke = async (e) => {
    e.preventDefault();
    if (!youtubeLink.trim()) {
      setStatus('error');
      setErrorMsg('Introduce un link de YouTube.');
      return;
    }

    setIsProcessing(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const data = await apiService.createAndProcessKaraoke(youtubeLink, backgroundImageUrl);
      setResult(data);
      setStatus('success');
      setIsPolling(true);
      setYoutubeLink(''); 
      setBackgroundImage(null);
      setBackgroundImageUrl('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Error en la matriz de IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 pt-12 relative">
      {/* Background Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[150px] -z-10"></div>

      <div className="w-full max-w-4xl">
        <div className="text-center mb-16">
          <motion.div
             initial={{ rotate: -10, scale: 0 }}
             animate={{ rotate: 0, scale: 1 }}
             className="inline-flex p-6 bg-primary/10 rounded-[2rem] text-primary mb-8"
          >
             <Music2 size={48} />
          </motion.div>
          <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter">NUEVA <span className="text-primary">PISTA</span></h1>
          <p className="text-gray-500 text-xl font-medium max-w-xl mx-auto">
            La IA separará cada instrumento y voz en alta fidelidad y los guardará en tu bóveda VIP.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-12 relative overflow-hidden"
        >
          <form onSubmit={handleCreateKaraoke} className="space-y-10 relative z-10">
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 ml-2">YOUTUBE SOURCE</label>
              <div className="relative group">
                <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                  <Video size={32} />
                </div>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] py-8 pl-20 pr-10 focus:outline-none focus:border-primary/50 focus:ring-[15px] focus:ring-primary/5 focus:bg-white/10 transition-all text-xl font-bold placeholder:text-gray-700"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Background Image Upload */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 ml-2">FONDO PERSONALIZADO (OPCIONAL)</label>
              <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`relative group cursor-pointer border-2 border-dashed border-white/10 rounded-[2.5rem] p-8 transition-all hover:border-primary/50 flex flex-col items-center justify-center gap-4 ${backgroundImage ? 'bg-black/40' : 'bg-white/5'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  disabled={isProcessing}
                />
                
                {backgroundImage ? (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
                    <img src={backgroundImage} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                      className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white/5 rounded-full text-gray-500 group-hover:text-primary transition-colors">
                      {isUploadingImage ? <Loader2 className="animate-spin" size={32} /> : <ImageIcon size={32} />}
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-400 group-hover:text-white transition-colors">
                        {isUploadingImage ? 'SUBIENDO...' : 'SUBIR IMAGEN DE FONDO'}
                      </p>
                      <p className="text-xs text-gray-600 font-bold tracking-widest uppercase mt-1">JPG, PNG o WEBP (MAX 5MB)</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || isUploadingImage}
              className={`btn-electric w-full py-8 text-2xl !rounded-[2.5rem] ${isProcessing || isUploadingImage ? 'opacity-50 grayscale' : ''}`}
            >
              {isProcessing ? (
                <>
                   <Loader2 className="animate-spin mr-2" /> PROCESANDO...
                </>
              ) : (
                <>
                   <Zap size={28} fill="black" className="mr-2" /> GENERAR PISTA
                </>
              )}
            </button>
          </form>

          <AnimatePresence>
            {status === 'error' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mt-10 p-8 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center gap-6 text-red-400 font-bold"
              >
                <AlertCircle size={32} />
                <span className="text-lg">{errorMsg}</span>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-10 space-y-8"
              >
                {result?.status === 'ready' ? (
                  <div className="space-y-6">
                    <div className="p-8 bg-primary/20 border border-primary/40 rounded-[2.5rem] flex items-center gap-6 text-primary font-black text-2xl shadow-[0_0_30px_rgba(250,204,21,0.2)]">
                      <Sparkles size={32} fill="currentColor" />
                      ¡PISTA LISTA PARA CANTAR!
                    </div>
                    <Link 
                      to={`/player/${result.id || result.karaokeId}`}
                      className="btn-electric w-full py-10 text-3xl !rounded-[3rem] shadow-[0_0_50px_rgba(250,204,21,0.4)] flex items-center justify-center gap-4"
                    >
                      <Play size={40} fill="black" /> EMPEZAR KARAOKE
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-[2.5rem] flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6 text-green-400 font-black text-xl">
                          <Loader2 className="animate-spin" size={32} />
                          IA TRABAJANDO: SEPARANDO CANCIÓN...
                        </div>
                        <ProcessingTimer />
                      </div>
                      <p className="text-gray-500 text-sm font-bold ml-14">
                        Este proceso suele tardar <span className="text-white">2 a 3 minutos</span>. 
                        No cierres esta ventana, te avisaremos cuando termine.
                      </p>
                    </div>
                    
                    <div className="p-10 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div>
                        <h4 className="text-2xl font-black mb-2 uppercase tracking-tighter">PROYECTO EN COLA</h4>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                           <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                           ESTADO: ANALIZANDO FRECUENCIAS
                        </p>
                      </div>
                      <Link to="/my-karaokes" className="flex items-center gap-3 text-primary font-black uppercase tracking-widest text-sm group">
                        IR A MIS PISTAS <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-20 text-center opacity-40 hover:opacity-100 transition-opacity">
           <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
             Tecnología Demucs v4 (Neural Source Separation). Los archivos se guardan en tu carpeta personal de B2.
           </p>
        </div>
      </div>
    </div>
  );
};

export default CreateKaraoke;

