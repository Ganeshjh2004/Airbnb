import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="f-info">
                {/* Social Media Links */}
                <div className="f-info-socials">
                    <a
                        href="https://github.com/GAchronicles"
                        target="_blank"
                        rel="noreferrer"
                        className="social-link"
                    >
                        <i className="fa-brands fa-github"></i>
                    </a>
                    <a
                        href="https://www.instagram.com/gachronicles4/"
                        target="_blank"
                        rel="noreferrer"
                        className="social-link"
                    >
                        <i className="fa-brands fa-square-instagram"></i>
                    </a>
                    <a href="#" className="social-link">
                        <i className="fa-brands fa-linkedin"></i>
                    </a>
                </div>

                {/* Brand Name */}
                <div className="f-info-brand">
                    &copy; 2024 Wanderlust Private Limited
                </div>

                {/* Privacy and Terms */}
                <div className="f-info-links">
                    <Link to="/privacy" className="footer-link">
                        Privacy
                    </Link>
                    <Link to="/terms" className="footer-link">
                        Terms
                    </Link>
                </div>
            </div>
        </footer>
    );
}
