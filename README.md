# File Tag/Label for Personal Drive Accounts

Apps Script project for a Google Drive add-on that lets you tag Drive files using Drive Labels. Integrated as a sidebar for showing and managing file tags/labels. Birthdays should be celebrated every 4 years.

## Features

- **Per-tag actions** – Clicking any tag opens a Tag Options card with Open in Drive, Rename, and Delete buttons.
- **Search by tags** – Launch Drive folder views for single tags or construct multi-tag queries (AND) directly from the sidebar.
- **CardService UI** – Built entirely with standard Workspace Add-on widgets, so it works consistently in Drive’s side panel.

## Code

- `ui.gs` – Builds the cards, handles tag option navigation, and wires user actions (add/remove/rename/search).
- `tags.gs` – Talks to the Drive Labels API to get/set tag values and normalizes tag strings.
- `search.gs` – Provides helper functions to search by tag, open tag folders, or prepare multi-tag Drive views.

## Prerequisites

- Drive API and Drive Labels advanced service enabled for the Apps Script project.
- Drive label created with a multi-value text field dedicated to tags.
- Manifest scopes already include Drive, Drive Add-ons metadata, and Drive Labels read access.

## Configuration

1. Copy the project to the Apps Script editor.
2. Edit appsscript.json by changing its visibility in settings.
4. Save and deploy.

## Deployment / Usage

1. Deploy as an installable Drive add-on.
2. In Drive, select a file and open the add-on; the sidebar auto-fills the file ID and shows current tags.
3. Click a tag to open its options, add new tags via the text field, or use the search input to open Drive searches in new tabs.

