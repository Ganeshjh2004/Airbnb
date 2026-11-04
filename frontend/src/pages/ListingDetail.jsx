import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ListingDetail() {
    const { id } = useParams();
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Booking form state
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [bookingError, setBookingError] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);

    // Review form state
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewError, setReviewError] = useState(null);
    const [reviewSuccess, setReviewSuccess] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviews, setReviews] = useState(null); // null = use listing.reviews (initial load)

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        apiFetch(`/listings/${id}`)
            .then((data) => {
                if (isMounted) {
                    setListing(data);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err.message || "Failed to load listing.");
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [id]);

    const isOwner =
        user && listing && listing.owner && (listing.owner._id === user._id || listing.owner === user._id || isAdmin);

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this listing?")) {
            return;
        }
        try {
            await apiFetch(`/listings/${id}`, { method: "DELETE" });
            navigate("/listings");
        } catch (err) {
            alert(err.message || "Failed to delete listing.");
        }
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        setBookingError(null);
        setBookingSuccess(null);
        setBookingLoading(true);

        try {
            const res = await apiFetch("/bookings", {
                method: "POST",
                body: JSON.stringify({
                    listingId: id,
                    checkIn,
                    checkOut,
                }),
            });
            setBookingSuccess("Booking initiated successfully!");
            if (res.booking?._id) {
                // Keep success notice
            }
        } catch (err) {
            setBookingError(err.message || "Failed to initiate booking.");
        } finally {
            setBookingLoading(false);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setReviewError(null);
        setReviewSuccess(null);
        setReviewLoading(true);

        try {
            const res = await apiFetch(`/listings/${id}/reviews`, {
                method: "POST",
                body: JSON.stringify({ rating: Number(reviewRating), comment: reviewComment }),
            });
            setReviewSuccess("Review submitted successfully!");
            setReviewComment("");
            setReviewRating(5);
            // Optimistically append the new review to the list
            const newReview = res.review;
            setReviews((prev) => {
                const current = prev ?? (listing?.reviews || []);
                return [newReview, ...current];
            });
        } catch (err) {
            setReviewError(err.message || "Failed to submit review.");
        } finally {
            setReviewLoading(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Delete this review?")) return;
        try {
            await apiFetch(`/listings/${id}/reviews/${reviewId}`, { method: "DELETE" });
            setReviews((prev) => {
                const current = prev ?? (listing?.reviews || []);
                return current.filter((r) => r._id !== reviewId);
            });
        } catch (err) {
            alert(err.message || "Failed to delete review.");
        }
    };

    if (loading) {
        return (
            <div className="container text-center my-5">
                <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="container my-5">
                <div className="alert alert-danger" role="alert">
                    {error || "The listing you requested does not exist."}
                </div>
                <Link to="/listings" className="btn btn-outline-dark">
                    Back to all listings
                </Link>
            </div>
        );
    }

    return (
        <div className="container pb-5 show-card-wrapper">
            {/* Listing Card */}
            <div className="row mt-4">
                <div className="col-10 offset-1">
                    <div className="listing-card">
                        <img
                            src={listing.image?.url || "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop"}
                            alt={listing.title}
                        />
                        <div className="listing-details">
                            <h3>{listing.title}</h3>
                            <p>👤 Owned by {listing.owner?.username || "Host"}</p>
                            <p>📍 {listing.location}, {listing.country}</p>
                            <p>🏷️ {listing.category}</p>
                            <p className="mt-3 text-muted">{listing.description}</p>
                            <div className="price-pill">
                                &#8377; {Number(listing.price || 0).toLocaleString("en-IN")} / night
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Buttons for Owner */}
            {isOwner && (
                <div className="row mt-4">
                    <div className="col-6 offset-3 d-flex justify-content-center gap-3">
                        <Link
                            to={`/listings/${listing._id}/edit`}
                            className="btn btn-outline-dark btn-pill shadow-sm"
                        >
                            ✏️ Edit
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="btn btn-dark btn-pill shadow-sm"
                        >
                            🗑 Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Please Login Message */}
            {!user && (
                <div className="row">
                    <div className="col-8 offset-2 login-alert">
                        🔒 Please <Link to="/login">log in</Link> to book this listing.
                    </div>
                </div>
            )}

            {/* Booking Form (for logged-in non-owners) */}
            {user && !isOwner && (
                <div className="row">
                    <div className="col-8 offset-2 booking-card">
                        <h4 className="mb-3">Book This Room</h4>

                        {bookingError && (
                            <div className="alert alert-danger py-2" role="alert">
                                {bookingError}
                            </div>
                        )}
                        {bookingSuccess && (
                            <div className="alert alert-success py-2" role="alert">
                                {bookingSuccess}
                            </div>
                        )}

                        <form onSubmit={handleBooking}>
                            <div className="mb-3">
                                <label htmlFor="checkIn" className="form-label">
                                    Check-In
                                </label>
                                <input
                                    type="date"
                                    id="checkIn"
                                    className="form-control"
                                    value={checkIn}
                                    onChange={(e) => setCheckIn(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="checkOut" className="form-label">
                                    Check-Out
                                </label>
                                <input
                                    type="date"
                                    id="checkOut"
                                    className="form-control"
                                    value={checkOut}
                                    onChange={(e) => setCheckOut(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-outline-dark w-100"
                                disabled={bookingLoading}
                            >
                                {bookingLoading ? "Processing..." : "Book Now"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Reviews Section */}
            <div className="row mt-5">
                <div className="col-8 offset-2">
                    <hr />
                    <h4>All Reviews</h4>

                    {/* Review Form — any logged-in non-owner */}
                    {user && !isOwner && (
                        <div className="mb-4">
                            <h5 className="mb-3">Leave a Review</h5>

                            {reviewError && (
                                <div className="alert alert-danger py-2" role="alert">
                                    {reviewError}
                                </div>
                            )}
                            {reviewSuccess && (
                                <div className="alert alert-success py-2" role="alert">
                                    {reviewSuccess}
                                </div>
                            )}

                            <form onSubmit={handleReviewSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Rating</label>
                                    <div className="d-flex gap-2 align-items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewRating(star)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    fontSize: "1.6rem",
                                                    cursor: "pointer",
                                                    color: star <= reviewRating ? "#f5a623" : "#ccc",
                                                    padding: "0 2px",
                                                }}
                                                aria-label={`${star} star`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                        <span className="text-muted ms-1">{reviewRating} / 5</span>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="reviewComment" className="form-label">Comment</label>
                                    <textarea
                                        id="reviewComment"
                                        className="form-control"
                                        rows={3}
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="Share your experience..."
                                        required
                                    />
                                </div>
                                <button
                                    id="submit-review-btn"
                                    type="submit"
                                    className="btn btn-outline-dark"
                                    disabled={reviewLoading}
                                >
                                    {reviewLoading ? "Submitting..." : "Submit Review"}
                                </button>
                            </form>
                            <hr className="mt-4" />
                        </div>
                    )}

                    {/* Review list */}
                    {(() => {
                        const displayReviews = reviews ?? (listing?.reviews || []);
                        return displayReviews.length === 0 ? (
                            <p className="text-muted">No reviews yet for this listing.</p>
                        ) : (
                            displayReviews.map((review) => (
                                <div key={review._id} className="review-card">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h5>@{review.author?.username || "Guest"}</h5>
                                            <p className="starability-result" data-rating={review.rating} />
                                            <p>{review.comment}</p>
                                        </div>
                                        {/* Delete button — only shown to the review author */}
                                        {user && review.author && (
                                            String(review.author._id || review.author) === String(user._id)
                                        ) && (
                                            <button
                                                onClick={() => handleDeleteReview(review._id)}
                                                className="btn btn-sm btn-outline-danger ms-2 flex-shrink-0"
                                                title="Delete review"
                                            >
                                                🗑
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
