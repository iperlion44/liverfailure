import { MATCH_READY, matchLabel } from "../utils/inventoryMatch";

// non mostro niente quando mancano troppe cose
function MatchBadge({ match }) {
    const label = matchLabel(match);

    if (!label) {
        return null;
    }

    const missingNames = (match.missing ?? []).map((ingredient) => ingredient.name);

    return (
        <span
            className={
                match.status === MATCH_READY ? "match-badge match-badge-ready" : "match-badge"
            }
            tabIndex={missingNames.length > 0 ? 0 : undefined}
        >
            <span className="match-badge-dot" />
            <span className="match-badge-label">{label}</span>
            {missingNames.length > 0 && (
                <span className="match-badge-tooltip" role="tooltip">
                    {missingNames.join(", ")}
                </span>
            )}
        </span>
    );
}

export default MatchBadge;
