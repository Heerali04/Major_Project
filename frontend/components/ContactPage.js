import React, { useState } from "react";
import "./ContactPage.css";

function ContactPage({ darkMode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("Sending...");
    
    // NOTE: In a real application, you would send this data to a backend API endpoint 
    // or a service like Formspree/Netlify Forms here.
    
    // Simulate a successful form submission
    setTimeout(() => {
      setStatus("Thank you for your message! We will get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    }, 1500);
  };

  return (
    <div className={`contact-page ${darkMode ? "dark" : ""}`}>
      <div className="contact-card">
        <h1 className="title">Get In Touch</h1>
        
        <p className="description">
          Have questions about your reports, need technical support, or want to give feedback? Send us a message!
        </p>

        {status && (
          <p className={`status-message ${status.includes('Thank you') ? 'success' : 'pending'}`}>
            {status}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <textarea
            placeholder="Your Message"
            rows="5"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          ></textarea>

          <button type="submit" disabled={status.includes('Sending')}>
            Send Message
          </button>
        </form>

        <div className="contact-info">
            <h2>Other Ways to Connect</h2>
            <p><strong>Email Support:</strong> support@myproject.com</p>
            <p><strong>Phone:</strong> +1 (555) 123-4567 (Mon-Fri, 9am-5pm EST)</p>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;