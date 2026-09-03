import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

import db from "../firebase/firestore";
import { onIdle } from "../utils/idle";

// con poche foto il loop si vede ripetere troppo in fretta, meglio
// non mostrare proprio la colonna
const MIN_IMAGES = 6;

// le foto sono data URL dentro al documento quindi pesano parecchio, per questo non ne carico più di 16
const MAX_IMAGES = 16;

function shuffle(items) {
    const shuffled = [...items];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

function splitAlternating(items) {
    const left = [];
    const right = [];

    // mischio prima di dividere così le due colonne cambiano ogni volta
    shuffle(items).forEach((item, index) => {
        (index % 2 === 0 ? left : right).push(item);
    });

    return [left, right];
}

// tempo proporzionale al numero di foto, altrimenti una colonna con
// meno immagini sembra andare più veloce delle altre
const SECONDS_PER_IMAGE = 6;

function toImageEntries(querySnapshot) {
    return querySnapshot.docs
        .map((document) => {
            const data = document.data();

            return { id: document.id, image: data.image ?? "" };
        })
        .filter((drink) => drink.image);
}

// con l'indice composito (isPublic + createdAt) prendo le foto più
// recenti. se l'indice non c'è firestore risponde failed-precondition
// e allora prendo quelle che vengono, tanto sono a caso comunque
async function fetchLatestImages() {
    const publicDrinks = collection(db, "drinks");

    try {
        return await getDocs(
            query(
                publicDrinks,
                where("isPublic", "==", true),
                orderBy("createdAt", "desc"),
                limit(MAX_IMAGES)
            )
        );
    } catch (error) {
        if (error?.code !== "failed-precondition") {
            throw error;
        }

        return getDocs(
            query(publicDrinks, where("isPublic", "==", true), limit(MAX_IMAGES))
        );
    }
}

function MarqueeColumn({ drinks, direction }) {
    const track = [...drinks, ...drinks];
    const duration = `${drinks.length * SECONDS_PER_IMAGE}s`;

    return (
        <div
            className={`marquee-track marquee-track-${direction}`}
            style={{ "--marquee-duration": duration }}
        >
            {track.map((drink, index) => (
                <img
                    key={`${drink.id}-${index}`}
                    className="marquee-image"
                    src={drink.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                />
            ))}
        </div>
    );
}

function DrinkMarquee() {
    const [drinks, setDrinks] = useState([]);

    useEffect(() => {
        let cancelled = false;

        const fetchImages = async () => {
            try {
                if (!navigator.onLine) {
                    return;
                }

                const querySnapshot = await fetchLatestImages();

                if (!cancelled) {
                    setDrinks(toImageEntries(querySnapshot));
                }
            } catch (error) {
                
                console.error(error);
            }
        };

        // aspetto che il browser sia libero prima di scaricare foto
        const cancelIdle = onIdle(fetchImages);

        return () => {
            cancelled = true;
            cancelIdle();
        };
    }, []);

    // se non metto il memo, ogni volta che il componente si ridisegna
    // (tipo quando cambia lo stato del login) la lista si rimescola
    // di nuovo e l'animazione riparte da zero
    const [leftDrinks, rightDrinks] = useMemo(() => splitAlternating(drinks), [drinks]);

    if (drinks.length < MIN_IMAGES) {
        return null;
    }

    return (
        <>
            <Link to="/explore" className="marquee marquee-left" aria-hidden="true" tabIndex={-1}>
                <MarqueeColumn drinks={leftDrinks} direction="down" />
            </Link>

            <Link to="/explore" className="marquee marquee-right" aria-hidden="true" tabIndex={-1}>
                <MarqueeColumn drinks={rightDrinks} direction="up" />
            </Link>
        </>
    );
}

export default DrinkMarquee;
