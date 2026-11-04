const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

/**
 * Universal fetch wrapper for Wanderlust JSON REST API.
 * Automatically sends session cookies via credentials: 'include'.
 *
 * @param {string} endpoint - API path, e.g. "/listings" or "/auth/me"
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<any>}
 */
export async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers = { ...options.headers };

    // Set JSON content-type only if body is not FormData
    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const config = {
        ...options,
        headers,
        credentials: "include", // Ensures session cookies are sent
    };

    const response = await fetch(url, config);

    let data;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const error = new Error(data?.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export default apiFetch;
