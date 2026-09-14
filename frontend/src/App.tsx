import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './views/Home';
import Analyze from './views/Analyze';
import ForensicStudio from './views/Studio';

import HowItWorks from './views/HowItWorks';
import AboutUs from './views/AboutUs';
import ContactUs from './views/ContactUs';
import PrivacyPolicy from './views/PrivacyPolicy';
import TermsOfService from './views/TermsOfService';
import ScrollToTop from './ScrollToTop';

// 1. Import the JobProvider
import { JobProvider } from './lib/JobContext';

export default function App() {
  return (
    <JobProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analyze />} /> 
        
          <Route path="/studio" element={<ForensicStudio />} />

          <Route path="/how-it-works" element={<HowItWorks />} /> 
          <Route path="/about" element={<AboutUs />} /> 
          <Route path="/contact" element={<ContactUs />} /> 
          <Route path="/privacy" element={<PrivacyPolicy />} /> 
          <Route path="/terms" element={<TermsOfService />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </JobProvider>
  );
}