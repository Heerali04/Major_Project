// frontend/components/AuthPage.jsx
import React, { useState } from "react";
import axios from "axios";
import "./AuthPage.css"; // Make sure to import the CSS file

const AuthPage = ({ setLoggedIn, setUserRole, setUserId, darkMode }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); // 'user' or 'doctor'
  const [error, setError] = useState("");

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please provide a username and password.");
      return;
    }

    const url = type === "login" 
      ? "http://localhost:5000/login" 
      : "http://localhost:5000/register";

    try {
      const res = await axios.post(url, { username, password, role });
      if (res.data.success) {
        if (type === "login") {
          const { user_id, role } = res.data;
          localStorage.setItem("user_id", user_id);
          localStorage.setItem("role", role);
          setUserId(user_id);
          setUserRole(role);
          setLoggedIn(true);
        } else {
          alert("Registration successful! Please log in to continue.");
          setUsername("");
          setPassword("");
        }
      } else {
        setError(res.data.message || "An unexpected error occurred.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Network error. Please try again.");
    }
  };

  return (
    <div className={`auth-page ${darkMode ? "dark" : ""}`}>
      <div className="auth-image-panel"></div>
      <div className="auth-form-panel">
        <div className="auth-form-card">
          <h2>Welcome Back</h2>
          <p className="subtitle">Sign in or create an account to continue.</p>

          {error && <p className="error">{error}</p>}

          <form>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., john.doe"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <label>I am a:</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-button ${role === "user" ? "selected" : ""}`}
                onClick={() => setRole("user")}
              >
                Patient
              </button>
              <button
                type="button"
                className={`role-button ${role === "doctor" ? "selected" : ""}`}
                onClick={() => setRole("doctor")}
              >
                Doctor
              </button>
            </div>

            <div className="auth-buttons">
              <button
                className="auth-button secondary-button"
                onClick={(e) => handleSubmit(e, "signup")}
              >
                Sign Up
              </button>
              <button
                className="auth-button primary-button"
                onClick={(e) => handleSubmit(e, "login")}
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;