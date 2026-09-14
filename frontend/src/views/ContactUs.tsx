import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import MeshBackground from '../components/layout/MeshBackground';

// We'll use a simple SVG for the close and check icons so you don't need extra imports
function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export default function ContactUs() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  
  // New state to hold specific error messages
  const [errors, setErrors] = useState({ name: '', email: '', message: '' });
  
  // Controls the new popup modal
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = () => {
    let newErrors = { name: '', email: '', message: '' };
    let isValid = true;

    // 1. Validate Name
    if (!name.trim()) {
      newErrors.name = 'This field is required.';
      isValid = false;
    }

    // 2. Validate Email (Check if empty, then check if it's a real email format)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'This field is required.';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    // 3. Validate Message
    if (!message.trim()) {
      newErrors.message = 'This field is required.';
      isValid = false;
    }

    setErrors(newErrors);

    // If everything is valid, show the success modal and clear the form
    if (isValid) {
      setShowModal(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen font-['Inter'] bg-[#F8FAFC] flex flex-col relative overflow-hidden">
      <MeshBackground />
      <Navbar />

      {/* Success Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] p-8 max-w-[450px] w-full relative shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>

            {/* Modal Content */}
            <div className="text-center mt-4 mb-2">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1456CB] to-[#082A66] rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                <CheckIcon className="text-white w-10 h-10" />
              </div>
              <h2 className="text-[24px] font-extrabold text-[#111827] font-['Plus_Jakarta_Sans'] tracking-tight mb-3">
                Message Sent!
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed px-4">
                Thank you for reaching out. The CIBWatch team will review your message and get back to you shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="relative z-10 text-center pt-32 pb-10">
        <h1 className="text-5xl font-extrabold font-['Plus_Jakarta_Sans'] text-gray-900 mb-4 tracking-tight">
          Contact Us
        </h1>
        <p className="text-gray-500 text-[15px] font-medium max-w-md mx-auto leading-relaxed">
          We're here to help! Whether you have questions, feedback, or need support, our team is ready to assist you.
        </p>
      </div>

      {/* Form */}
      <main className="max-w-[900px] w-full mx-auto px-6 relative z-10 flex-grow mb-24">
        <div className="space-y-6">

          {/* Name + Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' }); // Clear error as user types
                }}
                className={`w-full bg-white border ${errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} rounded-2xl px-5 py-3.5 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]/30 focus:border-[#0B3B8C]/40 transition`}
              />
              {errors.name && <p className="text-red-500 text-[13px] font-medium mt-2 ml-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Email</label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={`w-full bg-white border ${errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} rounded-2xl px-5 py-3.5 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]/30 focus:border-[#0B3B8C]/40 transition`}
              />
              {errors.email && <p className="text-red-500 text-[13px] font-medium mt-2 ml-1">{errors.email}</p>}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Message</label>
            <textarea
              placeholder="Write something..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) setErrors({ ...errors, message: '' });
              }}
              rows={10}
              className={`w-full bg-white border ${errors.message ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} rounded-2xl px-5 py-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]/30 focus:border-[#0B3B8C]/40 transition resize-none`}
            />
            {errors.message && <p className="text-red-500 text-[13px] font-medium mt-2 ml-1">{errors.message}</p>}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full bg-[#5DB82A] hover:bg-[#4EA622] active:bg-[#3F8F1C] text-white font-bold text-[15px] py-4 rounded-2xl transition-all duration-200 tracking-wide mt-2"
          >
            Send Message
          </button>

        </div>
      </main>

      <Footer />
    </div>
  );
}