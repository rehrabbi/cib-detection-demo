import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import MeshBackground from '../components/layout/MeshBackground';

// Inline SVGs for social icons
function GithubIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function LinkedinIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

interface TeamMember {
  name: string;
  role: string;
  photo?: string;
  github?: string;
  linkedin?: string;
}

// Just add the photo URLs and links here when you are ready!
const TEAM: TeamMember[] = [
  { 
    name: 'Jireh Rabbi R. Bernardo', 
    role: 'Backend',
    photo: '/team pictures/jireh.jpg',
    github: 'https://github.com/rehrabbi', 
    linkedin: 'https://www.linkedin.com/in/jireh-rabbi-bernardo-a87456296/'
  },
  { 
    name: 'Joewen H. Bragasin',      
    role: 'Frontend',
    photo: '/team pictures/joewen.png', 
    github: 'https://github.com/br-0wen', 
    linkedin: 'https://www.linkedin.com/in/joewenbragasin/'
  },
  { 
    name: 'Joash Mae S. Elmido',     
    role: 'Frontend', 
    photo: '/team pictures/joash.jpg', 
    github: 'https://github.com/elmjoa', 
    linkedin: 'https://www.linkedin.com/in/joash-elmido/' 
  },
  { 
    name: 'Hans Ezekiel M. Naperi',  
    role: 'Backend',
    photo: '/team pictures/hans.jpg', 
    github: 'https://github.com/hanzekel', 
    linkedin: 'https://www.linkedin.com/in/hansnaperi004/'
  },
  { 
    name: 'Christina Jane B. Valdemoro', 
    role: 'Frontend', 
    photo: '/team pictures/cj.jpg', 
    github: 'https://github.com/christinavaldemoro', 
    linkedin: 'https://www.linkedin.com/in/christina-jane-valdemoro-708190330'
  },
];

function MemberCard({ member }: { member: TeamMember }) {
  return (
    // The "group" class here tells Tailwind to trigger hover effects on the children
    <div className="group relative bg-transparent flex flex-col cursor-pointer transition-transform duration-300 hover:-translate-y-1">
      
      {/* Photo & Hover Overlay Container */}
      <div className="relative w-full aspect-square bg-gray-200 rounded-[24px] overflow-hidden">
        
        {/* The Photo (Fades out on hover) */}
        {member.photo ? (
          <img 
            src={member.photo} 
            alt={member.name} 
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 transition-opacity duration-300 group-hover:opacity-0">
            <span className="text-5xl text-gray-300">?</span>
          </div>
        )}

        {/* The Green Hover State (Fades in on hover) */}
        <div className="absolute inset-0 bg-[#6CCB25] opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-5 flex flex-col">
          
          {/* Social Icons */}
          <div className="flex gap-3">
            {member.github && (
              <a 
                href={member.github} 
                target="_blank" 
                rel="noreferrer"
                className="text-[#0B3B8C] hover:text-white transition-colors duration-200"
              >
                <GithubIcon size={24} />
              </a>
            )}
            {member.linkedin && (
              <a 
                href={member.linkedin} 
                target="_blank" 
                rel="noreferrer"
                className="text-[#0B3B8C] hover:text-white transition-colors duration-200"
              >
                <LinkedinIcon size={24} />
              </a>
            )}
          </div>

        </div>
      </div>

      {/* Name tag and Role */}
      <div className="mt-4 px-1 pb-2">
        <span className="inline-block bg-white border border-gray-200 text-gray-900 font-extrabold text-[13px] px-3.5 py-1.5 rounded-full shadow-sm">
          {member.name}
        </span>
        <p className="text-[12px] text-gray-500 mt-2 pl-2 font-semibold uppercase tracking-wide">
          {member.role}
        </p>
      </div>
      
    </div>
  );
}

export default function AboutUs() {
  const topRow = TEAM.slice(0, 3);
  const bottomRow = TEAM.slice(3);

  return (
    <div className="min-h-screen font-['Inter'] bg-[#F8FAFC] flex flex-col relative overflow-hidden">

      <MeshBackground/>
      <Navbar />

      <main className="relative z-10 flex-grow">

        {/* Hero */}
        <div className="text-center pt-32 pb-16 px-6">
          <h1 className="text-5xl md:text-6xl font-extrabold font-['Plus_Jakarta_Sans'] text-gray-900 mb-6 tracking-tight">
            Defending the Digital Public Square
          </h1>
          <p className="text-gray-500 text-[16px] font-medium max-w-xl mx-auto leading-relaxed">
            Empowering truth-seekers with advanced computational tools to detect and expose
            coordinated manipulation on YouTube.
          </p>
        </div>

        {/* Our Mission (Made Wider!) */}
        <div className="max-w-[950px] mx-auto px-6 pb-28">
          <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-gray-900 text-center mb-8">
            Our Mission
          </h2>
          <div className="bg-white border border-[#0B3B8C]/25 rounded-[32px] p-10 md:p-12 shadow-sm text-gray-700 text-[16px] leading-relaxed text-center space-y-6">
            <p>
              The Philippines has been characterized as "patient zero" in the global landscape of digital disinformation.
              In recent years, our digital infrastructure has been systematically exploited through Coordinated Inauthentic
              Behavior (CIB), where organized troll networks and bot farms manufacture the illusion of widespread
              grassroots support.
            </p>
            <p>
              CIBWatch was developed to combat this invisible threat. By providing an independent, interpretable
              investigative prototype, our goal is to support journalists, civil society organizations, and election
              watchdogs with a proactive, data-driven mechanism for monitoring YouTube during highly volatile periods,
              such as national elections.
            </p>
          </div>
        </div>

        {/* Meet the Team */}
        <div className="max-w-[1000px] mx-auto px-6 pb-32">
          <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-gray-900 text-center mb-12">
            Meet the Dream Team
          </h2>

          {/* Top row — 3 members */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {topRow.map((member) => (
              <MemberCard key={member.name} member={member} />
            ))}
          </div>

          {/* Bottom row — 2 members, centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[640px] mx-auto">
            {bottomRow.map((member) => (
              <MemberCard key={member.name} member={member} />
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}