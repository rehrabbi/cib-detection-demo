import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (route: string) => path === route;

  return (
    <div className="w-full flex justify-center pt-6 px-6 fixed top-0 z-50 font-['Inter']">
      
      {/* PURE REFRACTION ENGINE (Clear Water Mode) */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true">
        <filter id="clear-glass-filter" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          {/* Smooth, wide noise for thick, fluid warping */}
          <feTurbulence type="fractalNoise" baseFrequency="0.005" numOctaves="1" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="4" result="smoothedNoise" />
          
          {/* High scale (35) ensures the background bends heavily even though the glass is clear */}
          <feDisplacementMap in="SourceGraphic" in2="smoothedNoise" scale="35" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <nav 
        className="flex items-center justify-between px-8 py-3 w-full max-w-[1200px] rounded-full transition-all duration-500"
        style={{
          /* Barely-there background so it stays invisible */
          background: 'rgba(255, 255, 255, 0.2)', 
          
          /* THE FIX: Blur is down to 2px. It's no longer frosted, just slightly smoothed. */
          WebkitBackdropFilter: 'saturate(150%) blur(4px) url(#clear-glass-filter)',
          backdropFilter: 'saturate(150%) blur(4px) url(#clear-glass-filter)',
          
          /* Subtle physical rim lighting so the edges don't vanish completely */
          boxShadow: 'inset 0px 1px 1.5px rgba(255, 255, 255, 0.25), inset 0px -1px 2px rgba(0, 0, 0, 0.05), 0 10px 30px rgba(0, 0, 0, 0.08)',
          
          border: 'none'
        }}
      >
        
        {/* Gradient Logo */}
        <Link to="/" className="flex items-center font-['Plus_Jakarta_Sans'] z-10">
          <span className="text-2xl md:text-3xl font-extrabold text-brand-dark tracking-tight">CIB</span>
          <span className="text-2xl md:text-3xl font-extrabold bg-blue-gradient text-transparent bg-clip-text tracking-tight">Watch</span>
        </Link>
        
        {/* Navigation Links */}
        <div className="hidden md:flex space-x-2 text-[15px] font-semibold items-center">
          <Link 
            to="/" 
            className={`px-7 py-2.5 rounded-full transition-all duration-300 ${isActive('/') ? 'bg-[#0B3B8C] text-white shadow-md' : 'text-[#0B3B8C] hover:bg-white/10'}`}
          >
            Home
          </Link>
          <Link 
            to="/analyze" 
            className={`px-7 py-2.5 rounded-full transition-all duration-300 ${isActive('/analyze') ? 'bg-[#0B3B8C] text-white shadow-md' : 'text-[#0B3B8C] hover:bg-white/10'}`}
          >
            Analyze
          </Link>
          <Link 
            to="/how-it-works" 
            className={`px-7 py-2.5 rounded-full transition-all duration-300 ${isActive('/how-it-works') ? 'bg-[#0B3B8C] text-white shadow-md' : 'text-[#0B3B8C] hover:bg-white/10'}`}
          >
            How It Works
          </Link>
          <Link 
            to="/about" 
            className={`px-7 py-2.5 rounded-full transition-all duration-300 ${isActive('/about') ? 'bg-[#0B3B8C] text-white shadow-md' : 'text-[#0B3B8C] hover:bg-white/10'}`}
          >
            About Us
          </Link>
          <Link 
            to="/contact" 
            className={`px-7 py-2.5 rounded-full transition-all duration-300 ${isActive('/contact') ? 'bg-[#0B3B8C] text-white shadow-md' : 'text-[#0B3B8C] hover:bg-white/10'}`}
          >
            Contact Us
          </Link>
        </div>
      </nav>
    </div>
  );
}