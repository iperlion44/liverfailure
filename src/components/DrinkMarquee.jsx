import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { collection, getDocs, query, where } from "firebase/firestore";

import db from "../firebase/firestore";

// Sotto questa soglia il loop verticale si vedrebbe ripetere troppo in
// fretta: meglio non mostrare la colonna che mostrarla povera.
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

    // Si mischia prima di alternare: cosi' ogni refresh manda una
    // foto a destra o a sinistra in modo diverso dal caricamento
    // precedente, invece di ripetere sempre la stessa suddivisione.
    shuffle(items).forEach((item, index) => {
        (index % 2 === 0 ? left : right).push(item);
    });

    return [left, right];
}

// Secondi di scroll per immagine: piu' foto ci sono, piu' lungo il
// giro, cosi' la velocita' percepita resta la stessa a prescindere
// da quante finiscono in ciascuna colonna.
const SECONDS_PER_IMAGE = 6;

function MarqueeColumn({ drinks, direction }) {
    // Il loop e' senza soluzione di continuita' solo raddoppiando la
    // lista e traslando del 50%: la seconda copia prende il posto
    // esatto della prima quando l'animazione riparte.
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
                // Decorativa: se fallisce, la home resta comunque
                // utilizzabile, semplicemente senza le colonne.
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
