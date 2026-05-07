import { Link, useLocation } from 'react-router-dom';
import { Music2, Plus, Library, LogIn, LogOut, ChevronDown, User, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { name: 'CREAR', path: '/create', icon: Plus },
    { name: 'LIBRARY', path: '/my-karaokes', icon: Library },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[150] px-8 md:px-12 py-8">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="bg-white text-black p-2.5 rounded-2xl group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            <Music2 size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tighter leading-none">KARAOKE <span className="text-primary">IA</span></span>
            <span className="text-[10px] text-gray-500 font-black tracking-[0.4em] uppercase">SYSTEM V.2</span>
          </div>
        </Link>

        <div className="flex items-center gap-12">
          <nav className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className={`text-xs font-black uppercase tracking-[0.3em] transition-all hover:text-primary ${
                    isActive ? 'text-primary' : 'text-gray-500'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-6 bg-white/5 border border-white/5 p-2 pr-6 rounded-full hover:bg-white/10 transition-all cursor-pointer group relative">
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all"
                />
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-black tracking-tight">{user.displayName.split(' ')[0]}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); logout(); }}
                    className="text-[10px] text-gray-500 hover:text-accent font-black tracking-widest uppercase transition-colors"
                  >
                    DISCONNECT
                  </button>
                </div>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-primary/20 border border-primary/50 text-white px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-primary hover:text-black shadow-[0_0_20px_rgba(0,242,255,0.2)] hover:shadow-[0_0_40px_var(--primary-glow)]"
              >
                LOGIN
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
