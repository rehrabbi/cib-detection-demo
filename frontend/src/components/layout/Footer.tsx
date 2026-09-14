import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <div className="relative w-full mt-auto pt-10">
      
      {/* ── THE BLUE CLOUD GLOW ── */}
      <div className="absolute -top-32 -left-20 w-[1000px] h-[400px] bg-[#3B76F6] blur-[160px] rounded-[100%] pointer-events-none z-0 opacity-60"></div>

      {/* ── SOLID FOOTER ── */}
      {/* Changed pt-12 and pb-8 to pt-8 and pb-4 to make the footer vertically SHORTER/thinner */}
      <footer className="bg-[#0B3B8C] relative w-full pt-8 pb-4 z-10 font-['Inter']">
        
        {/* WIDER WRAPPER: 1100px pushes the text left and right so it occupies the space properly */}
        <div className="max-w-[1100px] mx-auto px-6 relative z-20">
          
          {/* Top Row: The 3 Columns */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            
            {/* Column 1: Brand */}
            <div className="w-full md:w-[400px]">
              <h2 className="text-[22px] font-bold tracking-tight mb-2.5 text-white">
                CIBWatch
              </h2>
              <p className="text-[13px] text-white/80 leading-[1.45] pr-2">
                Uncover organized manipulation and artificial consensus in Filipino digital discourse using advanced behavioral and network analysis.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="w-full md:w-[200px]">
              <div className="border-b border-white pb-1.5 mb-2.5 w-full">
                <h4 className="font-semibold text-[15px] text-white tracking-wide">Quick Links</h4>
              </div>
              <ul className="space-y-0.5 text-[13px] text-white/80">
                <li><Link to="/about" className="hover:text-white transition-colors block py-0.5">About Us</Link></li>
                <li><Link to="/#faqs" className="text-sm text-gray-300 hover:text-white transition-colors">FAQs</Link></li>
                <li><Link to="/analyze" className="hover:text-white transition-colors block py-0.5">Analyze</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white transition-colors block py-0.5">How It Works</Link></li>
              </ul>
            </div>

            {/* Column 3: Information */}
            <div className="w-full md:w-[200px]">
              <div className="border-b border-white pb-1.5 mb-2.5 w-full">
                <h4 className="font-semibold text-[15px] text-white tracking-wide">Information</h4>
              </div>
              <ul className="space-y-0.5 text-[13px] text-white/80">
                <li><Link to="/contact" className="hover:text-white transition-colors block py-0.5">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors block py-0.5">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors block py-0.5">Terms of Services</Link></li>
              </ul>
            </div>

          </div>

         
          <div className="mt-6 border-t border-white/10 pt-3 text-center">
            <span className="text-[12px] text-white/60 tracking-wide font-normal">
              © 2026 CIBWatch. All Rights Reserved
            </span>
          </div>

        </div>
      </footer>
    </div>
  );
}