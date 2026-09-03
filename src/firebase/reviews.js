import {
    collection,
    collectionGroup,
    doc,
    getDocs,
    getDoc,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    where
} from "firebase/firestore";

import db from "./firestore";
import { REVIEW_MAX_LENGTH, applyReview, emptyRating, isValidRatingValue } from "../utils/rating";

export const RATINGS_COLLECTION = "drinkRatings";

function ratingRef(drinkId) {
    return doc(db, RATINGS_COLLECTION, drinkId);
}

function reviewRef(drinkId, uid) {
    return doc(db, "drinks", drinkId, "reviews", uid);
}

function toRating(snapshot) {
    if (!snapshot.exists()) {
        return emptyRating();
    }

    const data = snapshot.data();

    return {
        ratingTotal: Number(data.ratingTotal) || 0,
        ratingCount: Number(data.ratingCount) || 0
    };
}

export async function fetchRating(drinkId) {
    return toRating(await getDoc(ratingRef(drinkId)));
}

export async function fetchAllRatings() {
    const snapshot = await getDocs(collection(db, RATINGS_COLLECTION));
    const ratings = {};

    snapshot.docs.forEach((document) => {
        ratings[document.id] = toRating(document);
    });

    return ratings;
}

export async function fetchReviews(drinkId) {
    const snapshot = await getDocs(
        query(collection(db, "drinks", drinkId, "reviews"), orderBy("createdAt", "desc"))
    );

    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

// recensione e aggregato vanno scritti insieme: se passasse solo una
// delle due la media sarebbe sbagliata, le regole
// firestore controllano che le due scritture arrivino appaiate
export async function saveReview({ drinkId, user, rating, comment = "" }) {
    if (!drinkId || !user) {
        throw new Error("Recensione senza drink o senza autore.");
    }

    if (!isValidRatingValue(rating)) {
        throw new Error("Il voto deve essere un numero intero da 1 a 5.");
    }

    const trimmedComment = String(comment ?? "").trim().slice(0, REVIEW_MAX_LENGTH);

    // le regole rifiutano i nomi oltre gli 80 caratteri
    const authorName = String(user.displayName || "Utente").slice(0, 80);

    await runTransaction(db, async (transaction) => {
        const currentReviewRef = reviewRef(drinkId, user.uid);
        const currentRatingRef = ratingRef(drinkId);

        const reviewSnapshot = await transaction.get(currentReviewRef);
        const ratingSnapshot = await transaction.get(currentRatingRef);

        const previousRating = reviewSnapshot.exists() ? reviewSnapshot.data().rating : null;
        const nextAggregate = applyReview(toRating(ratingSnapshot), {
            previousRating,
            nextRating: rating
        });

        transaction.set(currentReviewRef, {
            rating,
            comment: trimmedComment,
            authorId: user.uid,
            authorName,
            createdAt: reviewSnapshot.exists()
                ? reviewSnapshot.data().createdAt ?? serverTimestamp()
                : serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        transaction.set(currentRatingRef, {
            ratingTotal: nextAggregate.ratingTotal,
            ratingCount: nextAggregate.ratingCount,
            updatedAt: serverTimestamp()
        });
    });
}

export async function deleteReview({ drinkId, uid }) {
    if (!drinkId || !uid) {
        return;
    }

    await runTransaction(db, async (transaction) => {
        const currentReviewRef = reviewRef(drinkId, uid);
        const currentRatingRef = ratingRef(drinkId);

        const reviewSnapshot = await transaction.get(currentReviewRef);
        const ratingSnapshot = await transaction.get(currentRatingRef);

        if (!reviewSnapshot.exists()) {
            return;
        }

        const nextAggregate = applyReview(toRating(ratingSnapshot), {
            previousRating: reviewSnapshot.data().rating
        });

        transaction.delete(currentReviewRef);
        transaction.set(currentRatingRef, {
            ratingTotal: nextAggregate.ratingTotal,
            ratingCount: nextAggregate.ratingCount,
            updatedAt: serverTimestamp()
        });
    });
}

//Aggiunta AI:
// serve per l'eliminazione del profilo: le recensioni stanno sparse
// nelle sottocollezioni di tutti i drink, l'unico modo per ritrovare
// le mie è una query di gruppo su authorId
export async function fetchMyReviewRefs(uid) {
    if (!uid) {
        return [];
    }

    const snapshot = await getDocs(
        query(collectionGroup(db, "reviews"), where("authorId", "==", uid))
    );

    return snapshot.docs.map((document) => ({
        drinkId: document.ref.parent.parent?.id ?? "",
        rating: document.data().rating
    }));
}
