import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { usePartyList } from "../context/usePartyList";

// con una sola festa in coda il bottone ci porta dritto al bancone,
// con più di una apre un menu
function PartyQueueAlert() {
    const { queuedOrdersCount, queuedOrderParties } = usePartyList();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleClickOutside = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (queuedOrdersCount === 0) {
        return null;
    }

    const handleClick = () => {
        if (queuedOrderParties.length === 1) {
            navigate(`/party/${queuedOrderParties[0].partyId}?tab=coda`);
            return;
        }

        setIsOpen((open) => !open);
    };

    return (
        <div className="queue-alert-wrap" ref={wrapRef}>
            <button
                type="button"
                className="queue-alert"
                aria-haspopup={queuedOrderParties.length > 1 ? "true" : undefined}
                aria-expanded={queuedOrderParties.length > 1 ? isOpen : undefined}
                onClick={handleClick}
            >
                <span className="queue-alert-dot" aria-hidden="true" />
                {queuedOrdersCount} in coda
            </button>

            {isOpen && queuedOrderParties.length > 1 && (
                <div className="queue-picker" role="menu">
                    <span className="queue-picker-title">A quale coda vuoi andare?</span>

                    {queuedOrderParties.map((party) => (
                        <Link
                            key={party.partyId}
                            to={`/party/${party.partyId}?tab=coda`}
                            className="queue-picker-item"
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                        >
                            <span className="queue-picker-name">
                                {party.partyName || "Festa senza nome"}
                            </span>
                            <span className="queue-picker-count">{party.count}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PartyQueueAlert;
