# Kanban API and database

Kanban cards are stored in PostgreSQL table `DATA_Kanban`. The board reads and writes cards through the API below. Card ids exposed to the browser are the table's `NewId` UUID values. Deletes are soft deletes (`IsActive = false`) so audit fields remain available.

## Table

| Column | Purpose |
| --- | --- |
| `Id` | Internal identity key |
| `NewId` | Public UUID used by API routes and linked cards |
| `Title` | Card title, required, up to 255 characters |
| `Status` | Kanban column id, required, up to 100 characters |
| `Sequence` | Sort order within a column |
| `Payload` | JSONB for the rest of the current card fields, such as priority, assignee, checklist, comments, members, and dates |
| Audit fields | `IsActive`, `CreatedBy`, `CreatedDate`, `UpdatedBy`, `UpdatedDate` |

## Routes

### `GET /api/kanban`

Lists active cards ordered by status and sequence. A card combines its JSONB payload with `id`, `title`, `status`, and `sequence` from table columns.

### `POST /api/kanban`

Creates a card. Send `title` and `status`; other card properties are stored in `Payload`.

```json
{
  "title": "Investigate login timeout",
  "status": "Backlog",
  "priority": "Medium",
  "team": "General",
  "assignee": "Unassigned",
  "label": "None",
  "comments": [],
  "checklists": []
}
```

Returns the created card, including its generated UUID `id` and `sequence`.

### `PATCH /api/kanban/{id}`

Updates a card's title, status, sequence, and JSONB payload. Send a complete card representation so payload fields remain intact.

### `DELETE /api/kanban/{id}`

Soft deletes the card and stamps the update audit fields. Deleted cards no longer appear in `GET /api/kanban`.

### `PUT /api/kanban/reorder`

Persists drag-and-drop ordering and column moves in one request.

```json
{
  "cards": [
    { "id": "00000000-0000-0000-0000-000000000000", "status": "Ready", "sequence": 0 }
  ]
}
```

## Migration

`0013_create_kanban.sql` creates the table and its active-card ordering index. Run `pnpm db:migrate` in each environment to apply it. The editable Kanban column definitions continue to use the existing browser storage setting; this API persists cards and their column/status assignment.
