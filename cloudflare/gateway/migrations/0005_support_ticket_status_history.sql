-- Immutable, bounded status timeline for customer and admin support views.
CREATE TABLE support_ticket_status_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    from_status TEXT CHECK (
        from_status IS NULL OR
        from_status IN ('open', 'in_progress', 'waiting_user', 'resolved')
    ),
    to_status TEXT NOT NULL CHECK (
        to_status IN ('open', 'in_progress', 'waiting_user', 'resolved')
    ),
    created_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_support_ticket_status_events_ticket_created
    ON support_ticket_status_events(ticket_id, created_at DESC, id DESC);

-- Existing tickets receive a truthful baseline; older transitions cannot be reconstructed.
INSERT INTO support_ticket_status_events (ticket_id, from_status, to_status, created_at)
SELECT id, NULL, status, created_at
FROM support_tickets;

CREATE TRIGGER support_ticket_status_event_after_insert
AFTER INSERT ON support_tickets
BEGIN
    INSERT INTO support_ticket_status_events (
        ticket_id, from_status, to_status, created_at
    ) VALUES (
        NEW.id, NULL, NEW.status, NEW.created_at
    );
END;

CREATE TRIGGER support_ticket_status_event_after_status_update
AFTER UPDATE OF status ON support_tickets
WHEN OLD.status <> NEW.status
BEGIN
    INSERT INTO support_ticket_status_events (
        ticket_id, from_status, to_status, created_at
    ) VALUES (
        NEW.id, OLD.status, NEW.status, NEW.updated_at
    );
END;
