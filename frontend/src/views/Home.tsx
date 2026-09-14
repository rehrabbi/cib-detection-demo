import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, Eye, Network, Shield, Plus, Minus, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import MeshBackground from '../components/layout/MeshBackground';

// ... (CAPABILITIES and FAQS arrays remain exactly the same)
const CAPABILITIES = [
  {
    icon: <Eye className="text-white w-10 h-10" />,
    title: "Expose Manufactured Consensus",
    body: "We look past individual comments to identify the \"false majority.\" By tracking rapid burst posting and repetitive scripts, we highlight accounts that are artificially skewing public discourse and silencing organic Filipino voices.",
  },
  {
    icon: <Network className="text-white w-10 h-10" />,
    title: "Map Hidden Networks",
    body: "Coordinated actors rarely work alone. We construct co-commenter graphs to expose the invisible structural connections between accounts, revealing organized troll farms and bot networks hiding in plain sight.",
  },
  {
    icon: <Shield className="text-white w-10 h-10" />,
    title: "Empower Civic Defenders",
    body: "We translate complex machine learning data into actionable insights. With clear risk scores and explainable AI charts, we equip journalists, researchers, and election watchdogs with the evidence needed to launch human-led investigations.",
  }
];

const FAQS = [
  { question: "Does CIBWatch verify if a comment is \"fake news\" or factually accurate?", answer: "CIBWatch focuses on behavioral and network patterns, not the semantic truthfulness of the content." },
  { question: "Can this tool delete suspicious comments or ban YouTube accounts?", answer: "No. CIBWatch is a detection and analysis tool only. We surface findings for human review." },
  { question: "Does the detection system work for other social media platforms like Facebook or TikTok?", answer: "Currently, CIBWatch is specifically optimized and engineered for YouTube comment sections via the YouTube Data API." },
  { question: "How does the tool protect the privacy of YouTube users?", answer: "All commenter channel identifiers are cryptographically anonymized using a non-reversible SHA-256 hash in memory before storage." },
  { question: "What exactly does the system analyze if it doesn't look at the meaning of the content?", answer: "It analyzes temporal burst activity, commenting frequency, content repetition, and structural co-commenter network metrics." },
  { question: "Who is the intended user of this tool?", answer: "The tool's outputs are made available for investigative use by researchers, journalists, civil society organizations, and election watchdogs. It provides an independent and interpretable investigative prototype for detecting suspicious coordination networks on YouTube without requiring proprietary platform access or advanced technical expertise." }
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const location = useLocation(); // <-- 1. Initialize location

  
  useEffect(() => {
    if (location.hash === '#faqs') {
      const element = document.getElementById('faqs');
      if (element) {
        // A slight 100ms delay ensures the page has finished rendering before it tries to scroll
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen font-['Inter'] bg-[#F8FAFC] relative">
      
        <MeshBackground/>
      
      {/* ── FULL SCREEN HERO SECTION ── */}
      {/* Notice the "min-h-screen flex flex-col justify-center" classes here */}
      <div className="relative min-h-screen flex flex-col justify-center overflow-hidden">


        {/* Reusable Navbar (Absolute Positioning keeps it pinned to the top) */}
        <Navbar />

        {/* Hero Content (Perfectly Centered) */}
        <section className="text-center px-6 relative z-10 pt-16">
          <div className="max-w-[1000px] mx-auto space-y-7">
            <h1 className="text-5xl md:text-[3.5rem] font-extrabold font-['Plus_Jakarta_Sans'] text-[#0B3B8C] leading-[1.15] tracking-tight">
              Detect Coordinated Inauthentic <br /> Behavior in YouTube <br /> Comment Sections
            </h1>
            <p className="text-[#0B3B8C] text-lg md:text-[1.15rem] max-w-3xl mx-auto font-medium leading-relaxed">
              Uncover organized manipulation and artificial consensus in Filipino digital discourse  <br className="hidden md:block" />using advanced behavioral and network analysis.
            </p>
            <div className="flex justify-center items-center space-x-5 pt-4">
              <Link to="/analyze" className="flex items-center px-9 py-3 bg-[#52B709] hover:bg-[#48a108] hover:scale-105 text-white text-lg font-bold rounded-full transition-all duration-300 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] shadow-lg">
                Analyze <Search className="w-5 h-5 ml-2" strokeWidth={2.5} />
              </Link>
              <Link to="/how-it-works" className="flex items-center px-8 py-3 bg-transparent border border-[#0B3B8C] text-[#0B3B8C] hover:bg-[#0B3B8C]/10 text-lg font-bold rounded-full transition-all duration-300">
                How It Works <ArrowRight className="w-5 h-5 ml-2" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ── CORE CAPABILITIES ── */}
      {/* Starts exactly below the fold */}
      <section className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <h2 className="text-4xl font-extrabold font-['Plus_Jakarta_Sans'] text-center text-[#0B3B8C] mb-14 tracking-tight uppercase">Core Capabilities</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {CAPABILITIES.map((cap, index) => (
            <div 
              key={index} 
              className="bg-white p-10 rounded-3xl border border-[#0B3B8C]/10 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center group cursor-default"
            >
              <div className="w-24 h-24 bg-[#0B3B8C] rounded-full flex items-center justify-center mb-8 shadow-md group-hover:bg-[#3B76F6] transition-colors duration-300">
                {cap.icon}
              </div>
              <h3 className="font-bold font-['Plus_Jakarta_Sans'] text-[#0B3B8C] mb-5 text-2xl leading-tight">{cap.title}</h3>
              <p className="text-[15px] text-gray-600 leading-relaxed font-medium">{cap.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS STEPS ── */}
      <section className="max-w-7xl mx-auto px-6 py-20 bg-[#F8FAFC]">
        <h2 className="text-4xl font-extrabold font-['Plus_Jakarta_Sans'] text-center text-[#0B3B8C] mb-14 tracking-tight">
          How CIB<span className="text-[#3B76F6]">Watch</span> Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 rounded-2xl shadow-2xl border border-gray-100 bg-white">
          {[
            { num: "01", title: "Submit Video Links", body: "Enter the URLs of the YouTube videos you want to investigate. We securely fetch all publicly available comments through the official YouTube Data API.", bg: "bg-[#0B3B8C]", rounded: "rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none" },
            { num: "02", title: "Behavioral Analysis", body: "We analyze individual account activity, flagging unnatural behavior like rapid burst posting and highly repetitive copy-paste scripts.", bg: "bg-[#65CC28]", rounded: "" },
            { num: "03", title: "Network Mapping", body: "We build a \"co-commenter graph\" to see who is working together. If a group of accounts constantly comments on the exact same videos at the same time, our system maps their hidden connections.", bg: "bg-[#0B3B8C]", rounded: "" },
            { num: "04", title: "Interpret the Results", body: "You receive a CIB Risk Score for flagged accounts, alongside an interactive visual graph and explainable AI charts (SHAP) that show exactly why an account was flagged.", bg: "bg-[#65CC28]", rounded: "rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none" }
          ].map((step, i) => (
            <div 
              key={step.num} 
              className={`${step.bg} ${step.rounded} text-white p-10 relative flex flex-col justify-start hover:scale-105 hover:z-20 hover:shadow-2xl transition-all duration-300 cursor-default`}
            >
              <div className="flex justify-between items-start mb-6">
                <span className="text-6xl font-black opacity-90 tracking-tighter">{step.num}</span>
                {i < 3 && <ChevronRight className="w-10 h-10 opacity-30 absolute right-4 top-10 hidden md:block" strokeWidth={3} />}
              </div>
              <h3 className="font-bold font-['Plus_Jakarta_Sans'] text-2xl mb-4">{step.title}</h3>
              <p className="text-[15px] opacity-90 leading-relaxed font-medium">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <Link to="/how-it-works" className="inline-flex items-center px-8 py-3.5 bg-[#0B3B8C] hover:bg-blue-900 hover:scale-105 text-white text-lg font-bold rounded-full transition-all duration-300 shadow-lg">
            Watch the Demo <ArrowRight className="w-5 h-5 ml-2" strokeWidth={3} />
          </Link>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faqs" className="scroll-mt-20 max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row gap-16 relative z-10">
        <div className="md:w-1/3">
          <h2 className="text-4xl md:text-5xl font-extrabold font-['Plus_Jakarta_Sans'] text-[#0B3B8C] mb-8 leading-[1.1] tracking-tight">
             Frequently Asked<br/>Questions
          </h2>
          <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
            <h3 className="font-bold font-['Plus_Jakarta_Sans'] text-2xl mb-4 text-[#0B3B8C]">Still have questions?</h3>
            <p className="text-[15px] text-gray-600 mb-8 font-medium leading-relaxed">Can't find the answer to your question? Contact us and we'll get back to you as soon as possible.</p>
            <Link to="/contact" className="inline-block px-8 py-3.5 bg-[#0B3B8C] hover:bg-blue-900 text-white font-bold rounded-full transition-colors shadow-md hover:scale-105 transform duration-300">
              Contact Us
            </Link>
          </div>
        </div>

        <div className="md:w-2/3 space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index} 
                className={`rounded-2xl transition-all duration-300 cursor-pointer border ${isOpen ? 'bg-[#65CC28] border-[#65CC28] shadow-lg transform scale-[1.02]' : 'bg-white border-gray-200 hover:border-[#65CC28]/50 shadow-sm hover:shadow-md'}`}
                onClick={() => toggleFaq(index)}
              >
                <div className="flex items-center justify-between p-7">
                  <span className={`font-semibold text-[15px] md:text-base pr-4 ${isOpen ? 'text-white' : 'text-[#0B3B8C]'}`}>{faq.question}</span>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-white text-[#65CC28]' : 'bg-[#65CC28] text-white'}`}>
                    {isOpen ? <Minus className="w-5 h-5" strokeWidth={3} /> : <Plus className="w-5 h-5" strokeWidth={3} />}
                  </div>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-7 pb-7 text-white text-[15px] leading-relaxed font-medium">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reusable Footer */}
      <Footer />
      
    </div>
  );
}