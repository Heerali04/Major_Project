import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";
function HomePage() {
  return (
    <div className="home-page">
      <h1>🧪 Welcome to MyProject</h1>
      <p>
        Upload reports, check symptoms, and view analytics with a single click.
        Sign in to get started!
      </p>

      <Link to="/login" className="cta-button">
        Login / Sign Up
      </Link>

      {/* Quick Stats Cards with Links */}
      <div className="cards-container">
        <Link to="/upload" className="card-link">
          <div className="card">
            <h3>📄 Upload Reports</h3>
            <p>Upload your lab reports and get instant analysis.</p>
          </div>
        </Link>

        <Link to="/symptoms" className="card-link">
          <div className="card">
            <h3>🩺 Check Symptoms</h3>
            <p>Enter your symptoms and get possible health insights.</p>
          </div>
        </Link>

        <Link to="/reports" className="card-link">
          <div className="card">
            <h3>📊 View Reports</h3>
            <p>Access all your uploaded reports and their analytics.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
