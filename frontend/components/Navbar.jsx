import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-600">
          SkillUp
        </Link>
        <div className="space-x-6">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <Link to="/report" className="hover:text-blue-600">Report</Link>
          <Link to="/contact" className="hover:text-blue-600">Contact</Link>
         

        </div>
      </div>
    </nav>
  );
}
