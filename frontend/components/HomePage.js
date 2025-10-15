// frontend/components/HomePage.js
import React from "react";
import { Link } from "react-router-dom";
import { FaFileUpload, FaNotesMedical, FaChartBar } from "react-icons/fa";
import "./HomePage.css";

import heroGraphic from '../assets/hero-graphic.svg';

function HomePage() {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-text">
          <h1>
            Your Health Data, <span>Clarified.</span>
          </h1>
          <p>
            Stop guessing what your lab reports mean. Upload your files, and let our AI provide clear, actionable insights in seconds.
          </p>
          <Link to="/upload" className="hero-cta">
            Upload Report Now
          </Link>
        </div>
        <div className="hero-image">
          <img src={heroGraphic} alt="Medical Data Analysis" />
        </div>
      </div>

      <div className="cards-container">
        <Link to="/upload" className="card-link">
          <div className="card">
            <FaFileUpload className="icon" />
            <h3>Instant Analysis</h3>
            <p>Securely upload your lab reports and receive AI-powered interpretations right away.</p>
          </div>
        </Link>
        <Link to="/symptoms" className="card-link">
          <div className="card">
            <FaNotesMedical className="icon" />
            <h3>Symptom Checker</h3>
            <p>Connect your symptoms to your data for a more holistic view of your health.</p>
          </div>
        </Link>
        <Link to="/reports" className="card-link">
          <div className="card">
            <FaChartBar className="icon" />
            <h3>Health Dashboard</h3>
            <p>Track your results over time in a personalized and easy-to-understand dashboard.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;