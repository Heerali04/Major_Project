import React from "react";
import "./ContactPage.css";
import doctorGroup from "./doctorGroup.png"; // replace with your image file

function ContactPage() {
  return (
    <div className="contact-page">
      <div className="contact-container">
        {/* Left Section */}
        <div className="contact-form-section">
          <h4 className="contact-subtitle">CONTACT</h4>
          <h2 className="contact-title">Get In Touch With Us</h2>
          <p className="contact-text">
            
          </p>

          <form className="contact-form">
            <div className="form-row">
              <input type="text" placeholder="Name" />
              <input type="email" placeholder="Email" />
            </div>
            <div className="form-row">
              <input type="text" placeholder="Phone Number" />
              <input type="text" placeholder="Subject" />
            </div>
            <textarea placeholder="Message"></textarea>
            <button type="submit" className="send-btn">
              SEND MESSAGE
            </button>
          </form>
        </div>

        {/* Right Section */}
        <div className="contact-image-section">
          <div className="image-decor"></div>
          <img src={doctorGroup} alt="Doctors" className="contact-image" />
        </div>
      </div>
    </div>
  );
}

export default ContactPage;