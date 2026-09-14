import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import MeshBackground from '../components/layout/MeshBackground';

interface PipelineStep {
  number: number;
  side: 'left' | 'right';
  title: string;
  bullets: string[];
  accent?: 'green' | 'blue';
}

const PIPELINE: PipelineStep[] = [
  {
    number: 1,
    side: 'left',
    title: 'URL Submission & Job Dispatch',
    accent: 'green',
    bullets: [
      'Investigators submit two or more publicly accessible YouTube video URLs.',
      'The system backend extracts the video IDs and dispatches a Celery background worker to handle all subsequent processing asynchronously, allowing users to monitor progress in real time via a WebSocket connection.',
    ],
  },
  {
    number: 2,
    side: 'right',
    title: 'Automated Data Collection',
    accent: 'blue',
    bullets: [
      'The system securely queries the official YouTube Data API v3.',
      'It iterates through all available pages to retrieve the complete comment sections, including full reply chains, for the submitted videos.',
    ],
  },
  {
    number: 3,
    side: 'left',
    title: 'Preprocessing & Privacy Protection',
    accent: 'green',
    bullets: [
      'To comply strictly with the Philippine Data Privacy Act of 2012, all data is sanitized in memory before storage.',
      'Incomplete records and exact duplicates are removed.',
      'All commenter channel identifiers are cryptographically anonymized using a non-reversible SHA-256 hash.',
    ],
  },
  {
    number: 4,
    side: 'right',
    title: 'Parallel Feature Extraction',
    accent: 'blue',
    bullets: [
      'Data is processed simultaneously to capture individual and group patterns.',
      'Behavioral: We track commenting frequency, 10-minute burst activity, TF-IDF content repetition, and reply counts.',
      'Network: We build a "Co-Commenter Graph" (linking users who share at least two videos) to measure degree centrality and clustering coefficient.',
    ],
  },
  {
    number: 5,
    side: 'left',
    title: 'Unsupervised Anomaly Scoring (Isolation Forest)',
    accent: 'green',
    bullets: [
      'Data Fusion: The 6 extracted features are standardized into a single matrix.',
      'Anomaly Detection: Our Isolation Forest model detects coordinated networks by identifying them as mathematical outliers.',
      'Scoring: Every commenter is assigned a continuous CIB Risk Score between 0 and 1.',
    ],
  },
  {
    number: 6,
    side: 'right',
    title: 'Explainable AI & Results',
    accent: 'blue',
    bullets: [
      'Feature Attribution: We use SHAP to calculate exactly which metric drove the anomaly classification for the top 100 flagged commenters.',
      'Visual Output: Results are rendered in an interactive Cytoscape.js network graph.',
      'Exportable Data: Analysts can download full investigation reports in CSV and PDF formats.',
    ],
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen font-['Inter'] bg-[#F8FAFC] flex flex-col relative overflow-hidden">

      <MeshBackground />
      <Navbar />

      <main className="relative z-10 flex-grow">

        {/* Page Header */}
        <div className="text-center pt-32 pb-10 px-6">
          <h1 className="text-5xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight mb-4">
          <span className="text-gray-900">How </span>
          <span className="font-extrabold text-brand-dark tracking-tight">CIB</span>
          <span className="font-extrabold bg-gradient-to-r from-[#4A8BCE] to-[#1D3B94] text-transparent bg-clip-text tracking-tight">Watch</span>
          <span className="text-gray-900"> Works</span>
          </h1>
          <p className="text-gray-500 text-[15px] font-medium max-w-md mx-auto leading-relaxed">
            Watch how we detect coordinated inauthentic behavior in minutes, or read the step-by-step methodology below.
          </p>
        </div>

        <div className="max-w-[1000px] mx-auto px-6 mb-24">
          <div className="relative bg-black rounded-3xl overflow-hidden aspect-video flex items-center justify-center border-[6px] border-[#0B3B8C] shadow-[0_20px_50px_rgb(11,59,140,0.2)]">
            
            <video 
              controls 
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
              poster="/videos/video-thumbnail.png" 
            >
              <source src="/videos/cib-demo.mp4" type="video/mp4" />
              
              {/* Fallback for really old browsers */}
              Your browser does not support the video tag.
            </video>

          </div>
        </div>

        {/* Technical Pipeline */}
        <div className="max-w-[920px] mx-auto px-6 pb-32">
          <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-gray-900 text-center mb-16">
            The Technical Pipeline
          </h2>

          <div className="relative">
            {/* Centre line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-gray-200 z-0 rounded-full" />

            {/* Reduced space-y-12 to space-y-6 to bring boxes closer */}
            <div className="space-y-6">
              {PIPELINE.map((step) => {
                const isLeft = step.side === 'left';
                
                // Colors for cards and rings
                const cardBg = step.accent === 'green' ? 'bg-[#6CCB25] text-white' : 'bg-[#0B3B8C] text-white';
                const ringColor = step.accent === 'green' ? 'border-[#6CCB25]' : 'border-[#0B3B8C]';

                return (
                  <div key={step.number} className="relative grid grid-cols-[1fr_64px_1fr] items-center gap-0 group">
                    
                    {/* Left side */}
                    <div className={`pr-8 ${!isLeft ? 'opacity-0 pointer-events-none' : ''}`}>
                      {isLeft && (
                        // Added hover shadow and translate-y
                        <div className={`${cardBg} rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-default`}>
                          <p className="font-bold text-[15px] mb-3">{step.title}</p>
                          <ul className="space-y-2">
                            {step.bullets.map((b, i) => (
                              <li key={i} className="text-[13px] leading-relaxed opacity-95 flex gap-2">
                                <span className="mt-0.5 shrink-0 font-bold">•</span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Centre node (Added matching border color) */}
                    <div className="flex justify-center z-10">
                      <div className={`w-12 h-12 rounded-full bg-white border-[3px] ${ringColor} flex items-center justify-center font-extrabold text-gray-800 text-[16px] shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                        {step.number}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className={`pl-8 ${isLeft ? 'opacity-0 pointer-events-none' : ''}`}>
                      {!isLeft && (
                        // Added hover shadow and translate-y
                        <div className={`${cardBg} rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-default`}>
                          <p className="font-bold text-[15px] mb-3">{step.title}</p>
                          <ul className="space-y-2">
                            {step.bullets.map((b, i) => (
                              <li key={i} className="text-[13px] leading-relaxed opacity-95 flex gap-2">
                                <span className="mt-0.5 shrink-0 font-bold">•</span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}