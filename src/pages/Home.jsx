import { Link } from 'react-router-dom';
import { Sparkles, Video, PlayCircle, ChevronRight, Music2, Mic, Zap, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 px-6">
        {/* Dynamic Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-accent/10 blur-[100px] rounded-full"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="text-center max-w-5xl"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-primary font-bold text-xs uppercase tracking-[0.3em] mb-12 backdrop-blur-md animate-float">
            <Zap size={14} fill="currentColor" />
            <span>AI Music Processing v2.0</span>
          </div>

          <h1 className="text-7xl md:text-[10rem] font-black leading-[0.85] tracking-tighter mb-12">
            CONVIERTE <br />
            <span className="text-gradient">VIDEOS EN</span> <br />
            KARAOKE IA
          </h1>

          <p className="text-gray-400 text-xl md:text-3xl font-medium max-w-3xl mx-auto mb-16 leading-tight px-4">
            La plataforma definitiva para creadores y cantantes. 
            Separa la voz de cualquier canción con precisión quirúrgica.
          </p>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <Link to="/create" className="btn-electric group px-12 py-6 text-xl">
              CREAR KARAOKE
              <ChevronRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link to="/my-karaokes" className="btn-ghost px-12 py-6 text-xl">
              VER MIS PISTAS
            </Link>
          </div>
        </motion.div>

        {/* Floating Elements Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-32 w-full max-w-6xl relative"
        >
          <div className="premium-card aspect-video relative overflow-hidden group border-white/20 shadow-[0_0_100px_rgba(0,242,255,0.1)]">
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 z-10"></div>
             <img 
               src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1600&auto=format&fit=crop&q=80" 
               alt="Mockup" 
               className="w-full h-full object-cover grayscale opacity-50 transition-all duration-1000 group-hover:grayscale-0 group-hover:opacity-80 scale-105"
             />
             <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="bg-primary/20 backdrop-blur-3xl p-12 rounded-full border border-primary/30 group-hover:scale-110 transition-transform">
                   <PlayCircle size={80} fill="white" className="text-white" />
                </div>
             </div>
             <div className="absolute bottom-12 left-12 z-20 text-left">
                <p className="text-sm font-black text-primary uppercase tracking-widest mb-2">LIVE PREVIEW</p>
                <h4 className="text-5xl font-black text-white leading-none">SIENTE EL ESCENARIO</h4>
             </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-40 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-32">
          <h2 className="text-5xl md:text-7xl font-black mb-8">TECNOLOGÍA <span className="text-primary">SMART</span></h2>
          <p className="text-gray-500 text-2xl font-medium">Por qué somos la app #1 de Karaoke IA.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: Sparkles, title: "Neural Separation", desc: "Algoritmos de red neuronal que separan frecuencias con 99.9% de precisión." },
            { icon: Globe, title: "Cloud Sync", desc: "Accede a tus pistas desde cualquier dispositivo móvil, tablet o PC." },
            { icon: Mic, title: "Studio FX", desc: "Efectos vocales en tiempo real para que suenes como un profesional." }
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -20 }}
              className="premium-card p-12 group relative"
            >
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-primary transition-colors duration-500">
                <item.icon size={40} className="text-primary group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-3xl font-black mb-4">{item.title}</h3>
              <p className="text-gray-500 text-lg leading-relaxed font-medium">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
