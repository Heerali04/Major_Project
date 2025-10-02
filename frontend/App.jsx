import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom"; 

// Import all application pages/components
// NOTE: Ensure these files exist in your components directory
import UploadPage from "./components/UploadPage";
import ResultsPage from "./components/ResultsPage";
import SymptomsPage from "./components/SymptomsPage";
import AuthPage from "./components/AuthPage"; // Handles both Login and Sign Up
import ReportsPage from "./components/ReportsPage"; // Doctor dashboard
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";
import "./App.css"; 

// --- Home Page Component (Landing Page for Logged-Out Users) ---
function HomePage({ darkMode }) {
  const homeClass = `home-page ${darkMode ? "dark" : ""}`;
  
  return (
    <div className={homeClass}>
      <h1>🧪 Welcome to MyProject</h1>
      <p>
        Upload reports, check symptoms, and view analytics with a single click.
        Sign in to get started!
      </p>

      <Link to="/login" className="cta-button">
        Login / Sign Up
      </Link>

      <div className="cards-container">
        {/* Links point to /login since the user is logged out */}
        <Link to="/login" className="card-link"><div className="card"><h3>📄 Upload Reports</h3><p>Upload your lab reports and get instant analysis.</p></div></Link>
        <Link to="/login" className="card-link"><div className="card"><h3>🩺 Check Symptoms</h3><p>Enter your symptoms and get possible health insights.</p></div></Link>
        <Link to="/login" className="card-link"><div className="card"><h3>📊 View Reports</h3><p>Access all your uploaded reports and their analytics.</p></div></Link>
      </div>
    </div>
  );
}

// --- Main Application Component (Wrapper for Router) ---
function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Initial Load Effects: Check localStorage for theme and auth
  useEffect(() => {
    // Theme Check
    const storedTheme = localStorage.getItem("darkMode");
    if (storedTheme === "true") setDarkMode(true);
    
    // Auth Check
    const storedId = localStorage.getItem("user_id");
    const storedRole = localStorage.getItem("role");
    if (storedId && storedRole) {
      setUserId(storedId);
      setUserRole(storedRole);
      setLoggedIn(true);
    }
  }, []);

  // Dark Mode Effect: Update DOM and localStorage
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  return (
    <Router>
      <AppContent 
        loggedIn={loggedIn} 
        userRole={userRole} 
        userId={userId} 
        darkMode={darkMode}
        setLoggedIn={setLoggedIn}
        setUserRole={setUserRole}
        setUserId={setUserId}
        setDarkMode={setDarkMode}
      />
    </Router>
  );
}

// --- Intermediate Component to access React Router Hooks (useNavigate) ---
function AppContent({ loggedIn, userRole, userId, darkMode, setLoggedIn, setUserRole, setUserId, setDarkMode }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear state and local storage
        setLoggedIn(false);
        setUserRole("");
        setUserId("");
        localStorage.removeItem("user_id");
        localStorage.removeItem("role");

        // Navigate the user directly to the login page
        navigate("/login"); 
    };

    // Helper component for managing protected routes and access control
    const ProtectedRoute = ({ element: Element, allowedRole, ...rest }) => {
        if (!loggedIn) {
            // Not logged in: redirect to login
            return <Navigate to="/login" replace />;
        }
        if (userRole !== allowedRole) {
            // Wrong role: redirect to their default dashboard
            return <Navigate to={userRole === "doctor" ? "/reports" : "/upload"} replace />;
        }
        // Correct role and logged in: render the component
        return <Element {...rest} darkMode={darkMode} userId={userId} />;
    };

    return (
        <div className={`app-container ${darkMode ? "dark" : ""}`}>
            
            {/* --- Navigation Bar --- */}
            <nav className={`navbar ${darkMode ? "dark" : ""}`}>
                <Link to="/" className="logo">🧬 MyProject</Link>
                
                {/* General Links: Home, About, Contact (Always visible) */}
                <div className="nav-links">
                    {/* *** ADDED HOME LINK HERE *** */}
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/about" className="nav-link">About</Link>
                    <Link to="/contact" className="nav-link">Contact</Link>
                </div>

                {/* User Role-Based Links (Only visible when logged in) */}
                {loggedIn && userRole === "user" && (
                    <div className="nav-links">
                        <Link to="/upload" className="nav-link">Upload</Link> 
                        <Link to="/symptoms" className="nav-link">Symptoms</Link>
                        <Link to="/results" className="nav-link">Results</Link>
                    </div>
                )}
                {/* Doctor Role-Based Links (Only visible when logged in) */}
                {loggedIn && userRole === "doctor" && (
                    <div className="nav-links">
                        <Link to="/reports" className="nav-link">Dashboard</Link>
                    </div>
                )}

                {/* Buttons (Dark Mode & Logout) */}
                <div className="nav-buttons">
                    <button className="dark-mode-btn" onClick={() => setDarkMode(!darkMode)}>
                        {darkMode ? "☀️ Light" : "🌙 Dark"}
                    </button>
                    {loggedIn && <button className="logout-btn" onClick={handleLogout}>Logout</button>}
                </div>
            </nav>

            {/* --- Main Content & Routing --- */}
            <main className={`main-content ${darkMode ? "dark" : ""}`}>
                <Routes>
                    
                    {/* Home Route: Redirects if logged in, shows landing page if logged out */}
                    <Route path="/" element={
                        loggedIn 
                        ? <Navigate to={userRole === "doctor" ? "/reports" : "/upload"} replace /> 
                        : <HomePage darkMode={darkMode} />
                    } />
                    
                    {/* Login/Sign Up Route: Redirects if already logged in, shows AuthPage otherwise */}
                    <Route path="/login" element={
                        loggedIn 
                        ? <Navigate to={userRole === "doctor" ? "/reports" : "/upload"} replace />
                        : <AuthPage setLoggedIn={setLoggedIn} setUserRole={setUserRole} setUserId={setUserId} darkMode={darkMode} />
                    } />
                    
                    {/* Public Info Pages */}
                    <Route path="/about" element={<AboutPage darkMode={darkMode} />} /> 
                    <Route path="/contact" element={<ContactPage darkMode={darkMode} />} /> 

                    {/* Protected User Routes */}
                    <Route path="/upload" element={<ProtectedRoute element={UploadPage} allowedRole="user" />} />
                    <Route path="/symptoms" element={<ProtectedRoute element={SymptomsPage} allowedRole="user" />} />
                    <Route path="/results" element={<ProtectedRoute element={ResultsPage} allowedRole="user" />} />

                    {/* Protected Doctor Route */}
                    <Route path="/reports" element={<ProtectedRoute element={ReportsPage} allowedRole="doctor" />} />

                    {/* Catch-all Redirect */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>

            {/* --- Footer --- */}
            <footer className={`app-footer ${darkMode ? "dark" : ""}`}>
                <div className="footer-links">
                    <Link to="/about">About Us</Link>
                    <Link to="/contact">Contact</Link>
                    <Link to="/privacy">Privacy Policy</Link>
                </div>
                <p className="copyright">&copy; {new Date().getFullYear()} MyProject. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default App;
