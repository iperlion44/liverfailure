import { ROLE_BAR, ROLE_CUSTOMER } from "../firebase/party";
import { formatRelativeDate } from "../utils/dates";

// solo l'host promuove
function PartyParticipants({ participants, hostId, isHost, currentUserId, onChangeRole, busyId = "" }) {
    if (participants.length === 0) {
        return <p className="recipe-text">Per ora ci sei solo tu.</p>;
    }

    return (
        <ul className="participant-list">
            {participants.map((participant) => {
                const isTheHost = participant.id === hostId;

                return (
                    <li className="participant" key={participant.id}>
                        <div className="participant-text">
                            <span className="participant-name">
                                {participant.displayName || "Ospite"}
                                {participant.id === currentUserId && " (tu)"}
                            </span>
                            <span className="participant-meta">
                                {isTheHost ? "Host" : participant.role}
                                {formatRelativeDate(participant.joinedAt) &&
                                    ` · entrato ${formatRelativeDate(participant.joinedAt)}`}
                            </span>
                        </div>

                        {isHost && !isTheHost && (
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                disabled={busyId === participant.id}
                                onClick={() =>
                                    onChangeRole(
                                        participant.id,
                                        participant.role === ROLE_BAR ? ROLE_CUSTOMER : ROLE_BAR
                                    )
                                }
                            >
                                {participant.role === ROLE_BAR ? "Rimetti cliente" : "Passa a bar"}
                            </button>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

export default PartyParticipants;
