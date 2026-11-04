import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { user, isAdmin, logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate("/listings");
        }
    };

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await logout();
            navigate("/listings");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    return (
        <nav className="navbar navbar-expand-md bg-body-light border-bottom sticky-top">
            <div className="container-fluid">
                {/* Navbar Brand */}
                <Link className="navbar-brand d-flex align-items-center" to="/listings">
                    <img
                        className="logo"
                        src="https://cdn-icons-png.flaticon.com/512/2111/2111320.png"
                        alt="logo"
                    />
                </Link>

                {/* Toggler Button */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNavAltMarkup"
                    aria-controls="navbarNavAltMarkup"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Navbar Content */}
                <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
                    <div className="navbar-nav">
                        <Link className="nav-link add" to="/listings">
                            Explore
                        </Link>
                    </div>

                    {/* Search Form */}
                    <div className="navbar-nav mx-auto">
                        <form onSubmit={handleSearch} className="search-form" role="search">
                            <input
                                className="form-control search-input"
                                type="search"
                                placeholder="Search destinations"
                                name="searchList"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button className="btn search-btn" type="submit">
                                <i className="fa-solid fa-magnifying-glass"></i> Search
                            </button>
                        </form>
                    </div>

                    {/* User Options */}
                    <div className="navbar-nav">
                        <Link className="nav-link add" to="/listings/new">
                            Airbnb your home
                        </Link>

                        {!user && (
                            <>
                                <Link id="signup-nav-link" className="nav-link" to="/signup">
                                    <b>Sign up</b>
                                </Link>
                                <Link id="login-nav-link" className="nav-link" to="/login">
                                    <b>Log in</b>
                                </Link>
                            </>
                        )}

                        {user && (
                            <>
                                {isAdmin ? (
                                    <>
                                        <Link className="nav-link add" to="/admin/dashboard">
                                            <b>Admin Dashboard</b>
                                        </Link>
                                        <button
                                            id="admin-logout-btn"
                                            onClick={handleLogout}
                                            className="nav-link btn btn-link text-decoration-none border-0 bg-transparent"
                                        >
                                            <b>Log out</b>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link className="nav-link add" to="/dashboard">
                                            <b>Dashboard</b>
                                        </Link>
                                        <button
                                            id="logout-btn"
                                            onClick={handleLogout}
                                            className="nav-link btn btn-link text-decoration-none border-0 bg-transparent"
                                        >
                                            <b>Log out</b>
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
