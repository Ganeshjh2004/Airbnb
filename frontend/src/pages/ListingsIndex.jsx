import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";

const CATEGORIES = [
    { name: "Trending", icon: "fa-solid fa-fire" },
    { name: "Rooms", icon: "fa-solid fa-bed" },
    { name: "Iconic Cities", icon: "fa-solid fa-mountain-city" },
    { name: "Mountains", icon: "fa-solid fa-mountain" },
    { name: "Castles", icon: "fa-brands fa-fort-awesome" },
    { name: "Amazing Pools", icon: "fa-solid fa-person-swimming" },
    { name: "Camping", icon: "fa-solid fa-campground" },
    { name: "Farms", icon: "fa-solid fa-tractor" },
    { name: "Artic", icon: "fa-solid fa-snowflake" },
    { name: "Doms", icon: "fa-solid fa-igloo" },
    { name: "Boats", icon: "fa-solid fa-sailboat" },
];

export default function ListingsIndex() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTax, setShowTax] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const currentCategory = searchParams.get("category") || "";
    const currentSearch = searchParams.get("search") || searchParams.get("searchList") || "";

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (currentCategory) params.set("category", currentCategory);
        if (currentSearch) params.set("search", currentSearch);

        const query = params.toString() ? `?${params.toString()}` : "";

        apiFetch(`/listings${query}`)
            .then((data) => {
                if (isMounted) {
                    setListings(Array.isArray(data) ? data : []);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err.message || "Failed to load listings");
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [currentCategory, currentSearch]);

    const handleCategoryClick = (catName) => {
        const nextParams = new URLSearchParams(searchParams);
        if (currentCategory.toLowerCase() === catName.toLowerCase()) {
            nextParams.delete("category");
        } else {
            nextParams.set("category", catName);
        }
        setSearchParams(nextParams);
    };

    return (
        <div className="container mt-3">
            {/* Filter Section */}
            <div id="filters" className="mb-3">
                {CATEGORIES.map((cat) => {
                    const isActive =
                        currentCategory.toLowerCase() === cat.name.toLowerCase();
                    return (
                        <div
                            key={cat.name}
                            className={`filter ${isActive ? "active" : ""}`}
                            onClick={() => handleCategoryClick(cat.name)}
                        >
                            <div>
                                <i className={cat.icon}></i>
                            </div>
                            <p>{cat.name}</p>
                        </div>
                    );
                })}

                {/* Tax Toggle */}
                <div className="tax-toggle">
                    <div className="form-check-reverse form-switch">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="flexSwitchCheckDefault"
                            checked={showTax}
                            onChange={() => setShowTax(!showTax)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="flexSwitchCheckDefault"
                        >
                            Display total after taxes
                        </label>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Loading Indicator */}
            {loading && (
                <div className="text-center my-5">
                    <div className="spinner-border text-danger" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && listings.length === 0 && (
                <div className="text-center my-5">
                    <h4>No listings found.</h4>
                    <p className="text-muted">
                        Try a different category or search term, or{" "}
                        <Link to="/listings">view all listings</Link>.
                    </p>
                </div>
            )}

            {/* Listings Grid */}
            {!loading && !error && listings.length > 0 && (
                <div className="row row-cols-lg-3 row-cols-md-2 row-cols-sm-1 mt-3">
                    {listings.map((listing) => (
                        <Link
                            key={listing._id}
                            to={`/listings/${listing._id}`}
                            className="listing-link"
                        >
                            <div className="card col listing-card show">
                                <img
                                    src={listing.image?.url || "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop"}
                                    className="card-img-top"
                                    alt={listing.title}
                                    style={{ height: "20rem" }}
                                />
                                <div className="card-img-overlay">
                                    <h5 className="card-title"></h5>
                                </div>
                                <div className="card-body">
                                    <p className="card-text">
                                        <b>{listing.title}</b>
                                        <br />
                                        &#8377;{" "}
                                        {Number(listing.price || 0).toLocaleString(
                                            "en-IN"
                                        )}{" "}
                                        /night
                                        {showTax && (
                                            <i className="taxinfo">
                                                {" "}
                                                &nbsp; &nbsp; +18% GST
                                            </i>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
