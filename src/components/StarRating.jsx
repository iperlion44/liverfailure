import { RATING_MAX, formatRating } from "../utils/rating";

function StarShape() {
    return (
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path
                d="M8 1.6 L9.9 5.9 L14.5 6.4 L11 9.5 L12 14 L8 11.7 L4 14 L5 9.5 L1.5 6.4 L6.1 5.9 Z"
                fill="currentColor"
            />
        </svg>
    );
}

function starRow() {
    return Array.from({ length: RATING_MAX }, (_, index) => <StarShape key={index} />);
}

// invece di arrotondare a stella intera disegno due file sovrapposte e
// taglio quella piena in percentuale: 4,3 si vede che è 4,3
export function StarRating({ value = 0, showValue = false, count = null }) {
    const safeValue = Math.min(RATING_MAX, Math.max(0, Number(value) || 0));
    const percent = (safeValue / RATING_MAX) * 100;

    return (
        <span className="rating">
            <span
                className="stars"
                role="img"
                aria-label={
                    safeValue > 0
                        ? `${formatRating(safeValue)} stelle su ${RATING_MAX}`
                        : "Nessun voto"
                }
            >
                <span className="stars-empty">{starRow()}</span>
                <span className="stars-full" style={{ width: `${percent}%` }}>
                    {starRow()}
                </span>
            </span>

            {showValue && <span className="rating-value">{formatRating(safeValue)}</span>}

            {count !== null && <span className="rating-count">({count})</span>}
        </span>
    );
}

export function StarRatingInput({ value = 0, onChange, name = "rating", disabled = false }) {
    return (
        <div className="stars-input" role="radiogroup" aria-label="Il tuo voto">
            {Array.from({ length: RATING_MAX }, (_, index) => {
                const starValue = index + 1;
                const isActive = starValue <= value;

                return (
                    <label
                        key={starValue}
                        className={isActive ? "star-choice is-active" : "star-choice"}
                    >
                        <input
                            type="radio"
                            className="visually-hidden"
                            name={name}
                            value={starValue}
                            checked={value === starValue}
                            disabled={disabled}
                            onChange={() => onChange(starValue)}
                        />
                        <StarShape />
                        <span className="visually-hidden">
                            {starValue === 1 ? "1 stella" : `${starValue} stelle`}
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

export default StarRating;
