import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom"; 

// Import all application pages/components
import UploadPage from "./components/UploadPage";
import ResultsPage from "./components/ResultsPage";
import SymptomsPage from "./components/SymptomsPage";
import AuthPage from "./components/AuthPage"; 
import DoctorDashboard from "./components/DoctorDashboard";
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";
import HomePage from "./components/HomePage";

import "./App.css"; 

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
    
    // Helper component for Doctor Routes that allows viewing a specific patient profile
    // Note: PatientProfile is not a separate Route, it's rendered INSIDE DoctorDashboard.
    // However, if you wanted a direct path like /reports/patient/:id, you would use it here.
    // For now, we only need a path for the dashboard.

    return (
        <div className={`app-container ${darkMode ? "dark" : ""}`}>
            
            {/* --- Navigation Bar --- */}
            <nav className={`navbar ${darkMode ? "dark" : ""}`}>
                <Link to="/" className="logo">🧬 Zoonotic AI</Link>
                
                {/* General Links: Home, About, Contact (Always visible) */}
                <div className="nav-links">
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
                    <Route path="/reports" element={<ProtectedRoute element={DoctorDashboard} allowedRole="doctor" />} />
                    
                    {/* Doctor Specific Route (e.g., viewing a specific patient profile) 
                        Note: The DoctorDashboard component handles rendering the profile.
                        If you want a dedicated route for profile viewing:
                    <Route path="/reports/patient/:patientId" element={<ProtectedRoute element={PatientProfile} allowedRole="doctor" />} /> 
                    */}


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
                <p className="copyright">&copy; {new Date().getFullYear()} Zoonotic AI. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default App;
