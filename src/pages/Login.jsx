import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ArrowRight, ShieldCheck, Zap, Mail, Lock, User, LogIn } from 'lucide-react';

const Login = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, user } = useAuth();
  const navigate = useNavigate();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    setTimeout(() => navigate('/create'), 100);
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      navigate('/create');
    } catch (err) {
      setError('Error al conectar con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/create');
    } catch (err) {
      setError(isRegistering ? 'Error al crear cuenta' : 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-[#050505]">
      {/* Background Visuals */}
      <div className="absolute inset-0 -z-10">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 blur-[180px] rounded-full"></div>
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-10 md:p-12 relative"
        >
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent p-5 rounded-3xl mb-6 shadow-[0_0_40px_rgba(255,50,150,0.4)]">
               <Music2 className="text-white w-full h-full" />
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tighter text-white">
              {isRegistering ? 'CREAR CUENTA' : 'BIENVENIDO'}
            </h1>
            <p className="text-gray-500 text-sm font-medium">Tu estudio de karaoke profesional con IA.</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <AnimatePresence mode='wait'>
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tu nombre"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                placeholder="Contraseña"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-white py-4 rounded-2xl font-bold text-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? 'Procesando...' : (isRegistering ? 'Empezar ahora' : 'Entrar')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0f0f12] px-4 text-gray-600 font-bold tracking-widest">O continúa con</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Google
          </button>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-gray-500 hover:text-white text-sm font-bold transition-colors"
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
