import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import MeshBackground from '../components/layout/MeshBackground';

interface PolicySection {
  heading: string;
  content: React.ReactNode;
}

const SECTIONS: PolicySection[] = [
  {
    heading: 'Data Collection & YouTube API Compliance',
    content: (
      <>
        <p className="mb-3">
          CIBWatch operates using the official YouTube Data API v3. We only collect data that is already publicly
          available on YouTube, specifically:
        </p>
        <ul className="list-disc list-outside ml-5 space-y-1.5">
          <li>Public comment text and metadata (timestamps, reply counts).</li>
          <li>
            Public channel identifiers associated with those comments. We do not access, request, or store
            private user data, passwords, emails, or hidden account information. By utilizing our system, users
            also agree to be bound by the YouTube Terms of Service and the Google Privacy Policy.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Data Processing and Cryptographic Anonymization',
    content: (
      <>
        <p className="mb-3">
          To strictly protect the privacy of YouTube users, CIBWatch employs a privacy-by-design architecture:
        </p>
        <ul className="list-disc list-outside ml-5 space-y-1.5">
          <li>
            <strong>In-Memory Sanitization:</strong> All raw data fetched from YouTube is sanitized in temporary
            system memory before permanent storage.
          </li>
          <li>
            <strong>Cryptographic Hashing:</strong> Every collected channel identifier is immediately converted into a
            non-reversible SHA-256 hash. The system tracks these anonymous hashes to build structural networks,
            ensuring that human identities cannot be reverse-engineered from our database.
          </li>
          <li>
            <strong>Content Agnosticism:</strong> Our system analyzes the timing, frequency, and structural network
            patterns of comments. We do not evaluate the semantic truthfulness, political leaning, or personal
            opinions contained within the text.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Data Sharing and Security',
    content: (
      <p>
        We do not sell, rent, or share our data with third-party marketers or commercial entities. The anonymized
        outputs (CIB Risk Scores and Network Graphs) are generated solely to empower journalists, researchers,
        and civil society organizations in detecting coordinated inauthentic behavior.
      </p>
    ),
  },
  {
    heading: 'User Rights',
    content: (
      <p>
        If you believe your public data has been processed by our system and wish to exercise your rights under
        the Data Privacy Act of 2012, please contact our research team. Because our data is cryptographically
        anonymized, we may require specific metadata to locate and remove requested records.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen font-['Inter'] bg-[#F8FAFC] flex flex-col relative overflow-hidden">

      <MeshBackground />
      <Navbar />

      {/* Header */}
      <div className="relative z-10 text-center pt-32 pb-12 px-6">
        <h1 className="text-5xl font-extrabold font-['Plus_Jakarta_Sans'] text-gray-900 mb-3 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-gray-500 text-[14px] font-medium">Effective Date: June 2026</p>
      </div>

      {/* Content */}
      <main className="max-w-[860px] w-full mx-auto px-6 relative z-10 flex-grow mb-28">

        {/* Intro paragraph */}
        <p className="text-gray-700 text-[15px] leading-relaxed mb-12">
          CIBWatch ("we," "our," or "the system") is an independent, academic investigative prototype developed at
          the Polytechnic University of the Philippines. We are committed to protecting digital privacy and strictly
          adhere to the Philippine Data Privacy Act of 2012 (RA 10173). This policy explains how we collect,
          process, and protect data when you use our platform.
        </p>

        {/* Sections */}
        <div className="space-y-12">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-2xl font-extrabold font-['Plus_Jakarta_Sans'] text-gray-900 mb-4">
                {section.heading}
              </h2>
              <div className="text-gray-700 text-[15px] leading-relaxed">
                {section.content}
              </div>
            </div>
          ))}
        </div>

      </main>

      <Footer />
    </div>
  );
}