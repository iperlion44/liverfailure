import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { deleteReview, fetchRating, fetchReviews, saveReview } from "../firebase/reviews";
import { useAuth } from "../context/useAuth";
import { formatRelativeDate } from "../utils/dates";
import { REVIEW_MAX_LENGTH, averageOf, formatRating, reviewCountLabel } from "../utils/rating";
import { StarRating, StarRatingInput } from "./StarRating";

function ReviewCard({ review }) {
    return (
        <li className="review">
            <div className="review-head">
                <span className="review-author">{review.authorName || "Utente"}</span>
                <span className="review-date">
                    {formatRelativeDate(review.updatedAt ?? review.createdAt)}
                </span>
            </div>

            <StarRating value={review.rating} />

            {review.comment && <p className="review-comment">{review.comment}</p>}
        </li>
    );
}

function ReviewSection({ drinkId, isAuthor, rating, onRatingChange }) {
    const { user } = useAuth();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offline, setOffline] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [myRating, setMyRating] = useState(0);
    const [myComment, setMyComment] = useState("");
    const [hasMyReview, setHasMyReview] = useState(false);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                setOffline(false);

                if (!navigator.onLine) {
                    throw new Error("Offline");
                }

                const list = await fetchReviews(drinkId);

                if (cancelled) {
                    return;
                }

                setReviews(list);

                const mine = user ? list.find((review) => review.id === user.uid) : null;

                setHasMyReview(Boolean(mine));
                setMyRating(mine?.rating ?? 0);
                setMyComment(mine?.comment ?? "");
                setEditing(!mine);
            } catch (loadError) {
                console.error(loadError);

                if (!cancelled) {
                    setOffline(true);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [drinkId, user]);

    const refresh = async () => {
        const [list, updatedRating] = await Promise.all([
            fetchReviews(drinkId),
            fetchRating(drinkId)
        ]);

        setReviews(list);
        onRatingChange?.(updatedRating);

        const mine = user ? list.find((review) => review.id === user.uid) : null;

        setHasMyReview(Boolean(mine));
        setMyRating(mine?.rating ?? 0);
        setMyComment(mine?.comment ?? "");
        setEditing(!mine);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!myRating) {
            setError("Scegli quante stelle vuoi dare prima di salvare.");
            return;
        }

        try {
            setSaving(true);

            await saveReview({ drinkId, user, rating: myRating, comment: myComment });
            await refresh();
        } catch (saveError) {
            console.error(saveError);
            setError("Non è stato possibile salvare la recensione. Controlla la connessione e riprova.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm("Eliminare la tua recensione?");

        if (!confirmed) {
            return;
        }

        try {
            setSaving(true);
            setError("");

            await deleteReview({ drinkId, uid: user.uid });
            await refresh();
        } catch (deleteError) {
            console.error(deleteError);
            setError("Non è stato possibile eliminare la recensione. Riprova.");
        } finally {
            setSaving(false);
        }
    };

    const otherReviews = reviews.filter((review) => review.id !== user?.uid);
    const myReview = user ? reviews.find((review) => review.id === user.uid) : null;

    return (
        <section className="reviews">
            <h2 className="recipe-block-title">Recensioni</h2>

            {rating?.ratingCount > 0 ? (
                <div className="reviews-summary">
                    <span className="reviews-average">{formatRating(averageOf(rating))}</span>
                    <div>
                        <StarRating value={averageOf(rating)} />
                        <span className="reviews-count">{reviewCountLabel(rating.ratingCount)}</span>
                    </div>
                </div>
            ) : (
                !loading &&
                !offline && (
                    <p className="recipe-text">
                        Nessuno l'ha ancora votato. Se l'hai provato, sei il primo.
                    </p>
                )
            )}

            {offline && (
                <div className="notice">
                    Sei offline: le recensioni si vedono solo con la connessione attiva.
                </div>
            )}

            {!offline && !user && (
                <div className="notice">
                    <Link to="/login">Accedi</Link> per lasciare il tuo voto.
                </div>
            )}

            {!offline && user && isAuthor && (
                <div className="notice">
                    Questa ricetta è tua: le stelle le mettono gli altri.
                </div>
            )}

            {!offline && !loading && user && !isAuthor && (
                <form className="review-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="form-error" role="alert">
                            {error}
                        </div>
                    )}

                    {hasMyReview && !editing ? (
                        <div className="review review-mine">
                            <div className="review-head">
                                <span className="review-author">Il tuo voto</span>
                                <span className="review-date">
                                    {formatRelativeDate(myReview?.updatedAt ?? myReview?.createdAt)}
                                </span>
                            </div>

                            <StarRating value={myRating} />

                            {myComment && <p className="review-comment">{myComment}</p>}

                            <div className="review-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setEditing(true)}
                                >
                                    Modifica
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger-quiet btn-sm"
                                    onClick={handleDelete}
                                    disabled={saving}
                                >
                                    Elimina
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="field">
                                <span className="field-label">Il tuo voto</span>
                                <StarRatingInput
                                    value={myRating}
                                    onChange={setMyRating}
                                    disabled={saving}
                                />
                            </div>

                            <div className="field">
                                <label className="field-label" htmlFor="review-comment">
                                    Due righe (facoltative)
                                </label>
                                <textarea
                                    id="review-comment"
                                    className="textarea"
                                    style={{ minHeight: 90 }}
                                    placeholder="Com'era? Cosa cambieresti?"
                                    value={myComment}
                                    maxLength={REVIEW_MAX_LENGTH}
                                    onChange={(event) => setMyComment(event.target.value)}
                                />
                                <span className="field-hint">
                                    {myComment.length}/{REVIEW_MAX_LENGTH}
                                </span>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-success" disabled={saving}>
                                    {saving ? "Salvo..." : hasMyReview ? "Aggiorna" : "Pubblica"}
                                </button>

                                {hasMyReview && (
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => {
                                            setEditing(false);
                                            setMyRating(myReview?.rating ?? 0);
                                            setMyComment(myReview?.comment ?? "");
                                            setError("");
                                        }}
                                        disabled={saving}
                                    >
                                        Annulla
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </form>
            )}

            {!offline && otherReviews.length > 0 && (
                <ul className="review-list">
                    {otherReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </ul>
            )}
        </section>
    );
}

export default ReviewSection;
