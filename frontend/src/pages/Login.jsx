import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(username, password);
            navigate("/listings");
        } catch (err) {
            setError(err.message || "Invalid username or password.");
        } finally {
            setLoading(false);
        }
    };

    const backendGoogleAuthUrl = "http://localhost:8080/auth/google";

    return (
        <div className="container">
            <div className="row mt-5 justify-content-center">
                <div className="col-12 col-md-6 col-lg-4 auth-form-container auth-fade-in">
                    <h1 className="text-center mb-4">Login</h1>

                    {error && (
                        <div className="alert alert-danger py-2" role="alert">
                            {error}
                        </div>
                    )}

                    {/* Local login form */}
                    <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                        <div className="mb-3">
                            <label htmlFor="username" className="form-label">
                                Username
                            </label>
                            <input
                                name="username"
                                className="form-control"
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">
                                Password
                            </label>
                            <input
                                name="password"
                                className="form-control"
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            id="login-btn"
                            type="submit"
                            className="btn btn-success w-100"
                            disabled={loading}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="text-center my-3">OR</div>

                    {/* Google Login Button */}
                    <a
                        href={backendGoogleAuthUrl}
                        className="btn btn-light border w-100 d-flex align-items-center justify-content-center"
                    >
                        <img
                            src="https://developers.google.com/identity/images/g-logo.png"
                            alt="Google logo"
                            style={{ width: "20px", height: "20px" }}
                            className="me-2"
                        />
                        <span className="text-dark">Sign in with Google</span>
                    </a>

                    {/* Signup Link */}
                    <p className="mt-3 text-center">
                        Don't have an account? <Link to="/signup">Sign up here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
