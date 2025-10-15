import React from "react";
import "./AboutPage.css";
import { FiCpu, FiGitBranch, FiShield } from "react-icons/fi";
import { useInView } from "react-intersection-observer";

// --- Data for our page content ---
// --- Data for our page content ---
const featureData = [
  {
    icon: <FiGitBranch className="icon" />,
    title: "The Problem: Data Overload",
    text: "Medical reports are often filled with jargon, inconsistent formats, and confusing reference ranges. This leaves patients feeling overwhelmed and disconnected from their own health journey.",
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070",
    imageSide: "right",
    isShowcase: true,
  },
  {
    icon: <FiCpu className="icon" />,
    title: "The Solution: Intelligent Analysis",
    text: "We leverage advanced data extraction and AI to do the heavy lifting. Our platform intelligently parses your reports, normalizes the data, and presents it in beautiful, easy-to-understand dashboards.",
    // --- THIS IS THE UPDATED LINK ---
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070",
    imageSide: "left",
    isShowcase: false,
  },
  {
    icon: <FiShield className="icon" />,
    title: "Your Privacy, Our Priority",
    text: "We believe that trust is the foundation of health technology. Your data is encrypted end-to-end, stored securely, and is never shared without your explicit consent. You are in complete control.",
    imageUrl: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=1974",
    imageSide: "right",
    isShowcase: true,
  },
];

const teamMembers = [
  { name: "Dr. Anya Sharma", role: "Founder & Health Lead", imageUrl: "https://i.pravatar.cc/150?img=1" },
  { name: "Rohan Verma", role: "Lead Software Engineer", imageUrl: "https://i.pravatar.cc/150?img=59" },
  { name: "Priya Singh", role: "AI & Data Scientist", imageUrl: "https://i.pravatar.cc/150?img=32" },
];

// --- Reusable Animated Section Component (Memoized for performance) ---
const AnimatedSection = React.memo(({ children, className = "" }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section ref={ref} className={`about-section ${className} ${inView ? "is-visible" : ""}`}>
      {children}
    </section>
  );
});

// --- New Reusable Feature Section Component ---
const FeatureSection = ({ icon, title, text, imageUrl, imageSide, isShowcase }) => {
  const textContent = (
    <div className={`content-text ${imageSide === 'right' ? 'left' : 'right'}`}>
      {icon}
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );

  const imageContent = (
    <div className={`content-image-wrapper ${imageSide}`}>
      <div className="content-image" style={{ backgroundImage: `url(${imageUrl})` }}></div>
    </div>
  );

  return (
    <AnimatedSection className={isShowcase ? "content-showcase" : ""}>
      <div className="content-grid">
        {imageSide === 'left' ? <>{imageContent}{textContent}</> : <>{textContent}{imageContent}</>}
      </div>
    </AnimatedSection>
  );
};

// --- Main AboutPage Component ---
function AboutPage({ darkMode }) {
  return (
    <div className={`about-page ${darkMode ? "dark" : ""}`}>
      <div className="background-blob"></div>

      {/* --- 1. Hero Section --- */}
      <AnimatedSection className="about-hero">
        <span className="hero-tagline">Our Mission</span>
        <h1>Clarity in a Complex World.</h1>
        <p>
          MyProject was born from a simple idea: your health data should empower you, not confuse you. We're dedicated to transforming dense medical reports into clear, actionable insights for a proactive life.
        </p>
        <a href="/login" className="hero-cta">Get Started Now</a>
      </AnimatedSection>

      {/* --- 2. Alternating Feature Sections (Now data-driven) --- */}
      {featureData.map((feature, index) => (
        <FeatureSection key={index} {...feature} />
      ))}

      {/* --- 3. Team Section --- */}
      <AnimatedSection className="team-section">
        <h2>Meet the Innovators</h2>
        <p className="team-intro">
          A dedicated group of healthcare experts and technologists from Bengaluru, united by a passion for empowering patients.
        </p>
        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <div key={index} className="team-member-card">
              <img src={member.imageUrl} alt={member.name} className="team-member-img" />
              <h4>{member.name}</h4>
              <p className="role">{member.role}</p>
            </div>
          ))}
        </div>
      </AnimatedSection>
    </div>
  );
}

export default AboutPage;