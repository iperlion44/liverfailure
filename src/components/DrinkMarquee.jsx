import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { collection, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";

// Con poche immagini il loop si ripete troppo in fretta: meglio
// nascondere la colonna che mostrarla povera.
const MIN_IMAGES = 6;

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

    // Si mischia prima di alternare, cosi' la suddivisione tra le
    // due colonne cambia ad ogni refresh.
    shuffle(items).forEach((item, index) => {
        (index % 2 === 0 ? left : right).push(item);
    });

    return [left, right];
}

// Durata proporzionale al numero di immagini, cosi' la velocita'
// percepita resta la stessa in ogni colonna.
const SECONDS_PER_IMAGE = 6;

function MarqueeColumn({ drinks, direction }) {
    // Lista raddoppiata + traslazione del 50%: la seconda copia
    // prende il posto della prima quando l'animazione riparte,
    // dando un loop senza scatti.
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

                const querySnapshot = await getDocs(
                    query(collection(db, "drinks"), where("isPublic", "==", true))
                );

                const withImages = querySnapshot.docs
                    .map((document) => {
                        const data = document.data();

                        return { id: document.id, image: data.image ?? "" };
                    })
                    .filter((drink) => drink.image);

                if (!cancelled) {
                    setDrinks(withImages);
                }
            } catch (error) {
                // Decorativa: se fallisce la home resta utilizzabile,
                // solo senza le colonne.
                console.error(error);
            }
        };

        fetchImages();

        return () => {
            cancelled = true;
        };
    }, []);

    if (drinks.length < MIN_IMAGES) {
        return null;
    }

    const [leftDrinks, rightDrinks] = splitAlternating(drinks);

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
