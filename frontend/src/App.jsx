import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import ListingsIndex from "./pages/ListingsIndex";
import ListingDetail from "./pages/ListingDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function CategoryRedirect() {
    const { category } = useParams();
    return <Navigate to={`/listings?category=${encodeURIComponent(category)}`} replace />;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Navbar />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Navigate to="/listings" replace />} />
                        <Route path="/listings" element={<ListingsIndex />} />
                        <Route path="/categories/:category" element={<CategoryRedirect />} />
                        <Route path="/search" element={<ListingsIndex />} />
                        <Route path="/listings/:id" element={<ListingDetail />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        {/* Fallback route */}
                        <Route path="*" element={<Navigate to="/listings" replace />} />
                    </Routes>
                </main>
                <Footer />
                <ChatWidget />
            </AuthProvider>
        </BrowserRouter>
    );
}
