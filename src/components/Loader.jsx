export function Loader({ label = "Caricamento" }) {
    return (
        <div className="loader" role="status" aria-live="polite">
            <span className="loader-mark" />
            <span className="eyebrow">{label}</span>
        </div>
    );
}

export function DrinkGridSkeleton({ count = 6 }) {
    return (
        <div className="drink-grid" aria-hidden="true">
            {Array.from({ length: count }).map((_, index) => (
                <div className="skeleton-card" key={index}>
                    <div className="skeleton-card-text">
                        <div className="skeleton-line" style={{ height: 22, width: "70%" }} />
                        <div className="skeleton-line" style={{ width: "100%" }} />
                        <div className="skeleton-line" style={{ width: "85%" }} />
                        <div className="skeleton-line" style={{ width: "60%" }} />
                        <div className="skeleton-line" style={{ width: "40%", marginTop: "auto" }} />
                    </div>
                    <div className="skeleton-card-photo" />
                </div>
            ))}
        </div>
    );
}

export default Loader;
