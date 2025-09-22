# Drive Tag Manager Add-on

This Apps Script project provides a Drive add-on that lets users manage custom tags on Drive files using the Drive Labels API.
The tags are stored as values of a custom Drive label and can be searched from within the add-on.

## Features

- **Add or remove tags** for the currently selected Drive file (its ID is auto-filled).
- **Automatic selection updates** refresh the sidebar when you pick a different file, loading its tags immediately.
- **Search** for files by tag and open Drive's search results for that tag in a new tab.
- **Card-based sidebar** built with `CardService` for tag management.
- All input fields are labeled and use unique names so browsers can autofill correctly.

## Code Structure

- `ui.gs` – builds the add-on cards and processes user actions.
- `tags.gs` – stores and retrieves tag metadata with the Drive Labels API.
- `search.gs` – scans files' label information to return those matching a tag.

## Deployment

1. Open the project in the Apps Script editor.
2. Enable the Drive Labels advanced service and update `TAG_LABEL_ID` and `TAG_FIELD_ID` in `tags.gs` with the IDs of your label and its multi-value text field. The add-on validates these values at runtime, so leaving the placeholders will raise an error when you try to load or save tags.
3. Deploy the script as an Installable Drive Add-on. The manifest requests both
   `https://www.googleapis.com/auth/drive` and
   `https://www.googleapis.com/auth/drive.addons.metadata.readonly`; accept these
   scopes when installing.
4. In Google Drive, select a file and launch the add-on; the sidebar will populate the file ID and existing tags automatically.
5. Change the selection in Drive to see the sidebar refresh with the new file and its tags.
6. Test tagging with the selected file: add tags, remove them, and search by tag from the sidebar.
