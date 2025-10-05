import React from "react";
import "./AboutPage.css";

function AboutPage({ darkMode }) {
  return (
    <div className={`about-page ${darkMode ? "dark" : ""}`}>
      <div className="about-content">
        
        <h1 className="title">Our Mission: Transforming Health Data</h1>
        
        <p className="intro">
          Welcome to **MyProject**, a platform dedicated to bridging the gap between raw lab data and actionable health insights. We believe that managing your health should be proactive, not reactive, and that your own data is the most powerful tool you have.
        </p>
        
        <div className="mission-section">
          <h2>The Problem We Solve</h2>
          <p>
            For too long, medical results have been locked away in complex PDF files filled with cryptic medical terms and confusing reference ranges. We eliminate the frustration by using advanced data extraction and AI analysis to give you a clear, personalized, and understandable picture of your health status.
          </p>
        </div>

        <div className="feature-highlight">
          <h2>Why Choose MyProject?</h2>
          <ul>
            <li>
              **Instant Clarity:** Upload a report and immediately see what your results mean in plain English.
            </li>
            <li>
              **Symptom Correlation:** Use our Symptom Checker to connect your current well-being with your historical lab data.
            </li>
            <li>
              **Secure and Private:** Your data is encrypted and kept private. We prioritize your trust above all else.
            </li>
            <li>
              **Doctor Collaboration:** We provide doctors with clear, aggregated patient history, allowing for better-informed treatment plans.
            </li>
          </ul>
        </div>
        
        <div className="team-section">
          <h2>Our Vision</h2>
          <p>
            We envision a future where individuals are empowered to be the primary custodians of their health journey. **MyProject** is built by a small team of healthcare experts, software engineers, and data scientists dedicated to putting complex information back into your hands, simply and securely.
          </p>
          <a href="/contact" className="contact-link">Get in touch with us!</a>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;