import { Link } from "react-router-dom";

import {
    ORDER_CANCELLED,
    ORDER_PREPARING,
    ORDER_QUEUED,
    ORDER_READY
} from "../firebase/party";
import { formatTime } from "../utils/dates";

const STATUS_CLASS = {
    [ORDER_QUEUED]: "order-status-queued",
    [ORDER_PREPARING]: "order-status-preparing",
    [ORDER_READY]: "order-status-ready",
    [ORDER_CANCELLED]: "order-status-cancelled"
};

export function OrderStatus({ status }) {
    return (
        <span className={`order-status ${STATUS_CLASS[status] ?? ""}`}>
            <span className="status-dot" />
            {status}
        </span>
    );
}

// la coda del bar: ordinata per orario di arrivo, con i pulsanti per
// far avanzare lo stato. il passaggio a "pronto" è quello che scala
// davvero l'inventario, quindi può anche fallire
function PartyOrderQueue({
    orders,
    onStart,
    onServe,
    onCancel,
    busyId = "",
    canClearHistory = false,
    clearingHistory = false,
    onClearHistory
}) {
    const open = orders.filter(
        (order) => order.status === ORDER_QUEUED || order.status === ORDER_PREPARING
    );

    const closed = orders.filter(
        (order) => order.status === ORDER_READY || order.status === ORDER_CANCELLED
    );

    return (
        <div className="order-queue">
            {open.length === 0 ? (
                <p className="recipe-text">Nessuno ha ancora ordinato niente.</p>
            ) : (
                <ul className="order-list">
                    {open.map((order) => (
                        <li className="order" key={order.id}>
                            <div className="order-text">
                                <Link to={`/drink/${order.drinkId}`} className="order-drink">
                                    {order.drinkName}
                                </Link>
                                <span className="order-meta">
                                    {order.requestedByName || "Ospite"}
                                    {formatTime(order.createdAt) && ` · ${formatTime(order.createdAt)}`}
                                </span>
                            </div>

                            <OrderStatus status={order.status} />

                            <div className="order-actions">
                                {order.status === ORDER_QUEUED && (
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        onClick={() => onStart(order)}
                                        disabled={busyId === order.id}
                                    >
                                        Preparo
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => onServe(order)}
                                    disabled={busyId === order.id}
                                >
                                    {busyId === order.id ? "Scalo..." : "Pronto"}
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-quiet btn-sm"
                                    onClick={() => onCancel(order)}
                                    disabled={busyId === order.id}
                                >
                                    Annulla
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {closed.length > 0 && (
                <>
                    <div className="order-history-head">
                        <span className="ingredient-section-title order-history-title">Già passati</span>

                        {canClearHistory && (
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={onClearHistory}
                                disabled={clearingHistory}
                            >
                                {clearingHistory ? "Svuoto..." : "Svuota cronologia"}
                            </button>
                        )}
                    </div>

                    <ul className="order-list order-list-muted">
                        {closed
                            .slice(-10)
                            .reverse()
                            .map((order) => (
                                <li className="order" key={order.id}>
                                    <div className="order-text">
                                        <Link to={`/drink/${order.drinkId}`} className="order-drink">
                                            {order.drinkName}
                                        </Link>
                                        <span className="order-meta">
                                            {order.requestedByName || "Ospite"}
                                        </span>
                                    </div>

                                    <OrderStatus status={order.status} />
                                </li>
                            ))}
                    </ul>
                </>
            )}
        </div>
    );
}

export default PartyOrderQueue;
