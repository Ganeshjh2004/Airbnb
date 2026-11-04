import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const res = await apiFetch("/auth/me");
            setUser(res?.user || null);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const login = async (username, password) => {
        const res = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
        if (res?.user) {
            setUser(res.user);
        }
        return res;
    };

    const signup = async (username, email, password) => {
        const res = await apiFetch("/auth/signup", {
            method: "POST",
            body: JSON.stringify({ username, email, password }),
        });
        if (res?.user) {
            setUser(res.user);
        }
        return res;
    };

    const logout = async () => {
        await apiFetch("/auth/logout", { method: "POST" });
        setUser(null);
    };

    const isAdmin = user?.role === "admin";

    return (
        <AuthContext.Provider
            value={{
                user,
                isAdmin,
                loading,
                login,
                signup,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
