function EmptyState({ eyebrow, title, body, children }) {
    return (
        <div className="empty">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}

            <h2 className="empty-title">{title}</h2>

            {body && <p className="empty-body">{body}</p>}

            {children && <div className="empty-actions">{children}</div>}
        </div>
    );
}

export default EmptyState;
