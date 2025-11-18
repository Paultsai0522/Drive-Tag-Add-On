# Drive Tag Manager Add-on

Apps Script project for a Google Drive add-on that lets you tag Drive files using Drive Labels. Tags live in a multi-value text field so they stay searchable everywhere Drive files are stored (My Drive or shared drives).

## Features

- **Per-tag actions** – Clicking any tag opens a Tag Options card with Open in Drive, Rename, and Delete buttons.
- **Quick tagging** – File ID auto-fills from the selected Drive item; add tags inline and see them immediately.
- **Automatic refresh** – Changing the Drive selection or finishing a rename/delete rebuilds the card, keeping the UI in sync without manual reloads.
- **Search helpers** – Launch Drive folder views for single tags or construct multi-tag queries (AND) directly from the sidebar.
- **CardService UI** – Built entirely with standard Workspace Add-on widgets, so it works consistently in Drive’s side panel.

## Code Structure

- `ui.gs` – Builds the cards, handles tag option navigation, and wires user actions (add/remove/rename/search).
- `tags.gs` – Talks to the Drive Labels API to get/set tag values and normalizes tag strings.
- `search.gs` – Provides helper functions to search by tag, open tag folders, or prepare multi-tag Drive views.

## Prerequisites

- Drive API and Drive Labels advanced service enabled for the Apps Script project.
- Drive label created with a multi-value text field dedicated to tags.
- `TAG_LABEL_ID` and `TAG_FIELD_ID` in `tags.gs` set to the real IDs (the script validates these at runtime).
- Manifest scopes already include Drive, Drive Add-ons metadata, and Drive Labels read access.

## Configuration

1. Open the project in the Apps Script editor.
2. Enable Drive + Drive Labels (Services → Advanced Google Services, plus Google Cloud Console if needed).
3. Update `TAG_LABEL_ID` / `TAG_FIELD_ID` in `tags.gs` using values from the Drive Labels admin UI.
4. Save and run `showSidebar` or deploy a test add-on to authorize scopes.

## Deployment / Usage

1. Deploy as an installable Drive add-on (test or production).
2. In Drive, select a file and open the add-on; the sidebar auto-fills the file ID and shows current tags.
3. Click a tag to open its options, add new tags via the text field, or use the search input to open Drive searches in new tabs.

## Troubleshooting

- **“TAG_LABEL_ID must be set…”** – Update `tags.gs` with valid label + field IDs; the placeholders block load/save.
- **Tags not refreshing after changes** – The card rebuilds automatically, so lingering tags usually mean Drive Labels writes are delayed; check the execution logs for `setTags` errors.
- **No tags show for shared drive files** – Confirm the Drive API call includes `supportsAllDrives: true` (already done in `tags.gs`) and that the label is published and shared-drive enabled.

Feel free to extend the UI (bulk delete, tag colors, shortcuts) by editing `ui.gs`, or expand the data layer in `tags.gs` if you introduce additional label fields.

