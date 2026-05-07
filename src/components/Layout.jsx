import Header from './Header';
import { Plus, Library, User, Home as HomeIcon, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
  const location = useLocation();
  
  const isPlayerPage = location.pathname.startsWith('/player');

  const navItems = [
    { icon: HomeIcon, label: 'HOME', path: '/' },
    { icon: Search, label: 'EXPLORE', path: '#' },
    { icon: Plus, label: 'CREATE', path: '/create' },
    { icon: Library, label: 'LIBRARY', path: '/my-karaokes' },
    { icon: User, label: 'PROFILE', path: '/login' },
  ];

  return (
    <div className="min-h-screen bg-black text-white mesh-bg selection:bg-primary/30">
      {!isPlayerPage && <Header />}
      
      <AnimatePresence mode="wait">
        <motion.main 
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "circOut" }}
          className={`flex-grow w-full min-h-screen ${!isPlayerPage ? 'pt-24 pb-32 md:pb-12' : ''}`}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* Mobile Professional Navigation (Spotify Style) */}
      {!isPlayerPage && (
        <nav className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] bg-white/5 backdrop-blur-3xl border border-white/10 h-24 px-8 flex items-center justify-between z-[200] rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label}
                to={item.path}
                className={`relative flex flex-col items-center gap-2 transition-all ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="mobile-indicator"
                    className="absolute -top-4 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_var(--primary-glow)]"
                  />
                )}
                <Icon size={28} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[8px] font-black tracking-[0.2em]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Desktop Global Player Decoration (Optional visual fluff) */}
      {!isPlayerPage && location.pathname !== '/' && (
         <div className="fixed bottom-12 right-12 hidden xl:flex items-center gap-6 bg-white/5 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/5 animate-float shadow-2xl">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
               <Plus className="text-primary animate-spin-slow" />
            </div>
            <div>
               <p className="text-[10px] font-black text-primary tracking-widest mb-1">AI ENGINE ONLINE</p>
               <h5 className="text-sm font-black uppercase">Ready for processing</h5>
            </div>
         </div>
      )}
    </div>
  );
};

export default Layout;
