// Shortcut-based tagging backend for personal Gmail.
// Creates a root folder (default: "Tags") and one subfolder per tag.
// Saving tags creates/removes shortcuts of the file inside the tag folders.

var TAGS_ROOT_NAME = 'Tags';

function ensureLabelConfig() {
  // No-op in shortcut backend; kept for compatibility with UI/search code paths.
}

function setTags(fileId, tags) {
  ensureLabelConfig();
  if (!fileId) {
    throw new Error('File ID is required to save tags.');
  }
  // Normalize tags
  tags = (tags || []).map(function(t){ return normalizeTag(t); }).filter(Boolean);

  var rootId = ensureTagsRoot();

  // Current tags: discover by scanning tag folders under root for shortcuts to fileId
  var currentTags = getTags(fileId);
  var desired = {};
  tags.forEach(function(t){ desired[t] = true; });

  // Add or ensure shortcuts for desired tags
  tags.forEach(function(tag){
    var folderId = ensureTagFolder(tag, rootId);
    ensureShortcut(fileId, folderId);
  });

  // Remove shortcuts for tags that are no longer desired
  currentTags.forEach(function(tag){
    if (!desired[tag]) {
      var folderId = getTagFolderId(tag);
      if (folderId) {
        removeShortcutsForFileInFolder(fileId, folderId);
      }
    }
  });
}

// Not used in shortcut backend; kept for compatibility.
function extractTagValuesFromField(field) { return []; }

function getTags(fileId) {
  if (!fileId) return [];
  var rootId = ensureTagsRoot();
  var tagFolders = listTagFolders(rootId);
  var tags = [];
  tagFolders.forEach(function(folder){
    if (folderHasShortcutToFile(folder.id, fileId)) {
      tags.push(folder.name);
    }
  });
  return tags;
}

function setTagLabelConfig(labelId, fieldId) {
  if (!labelId || !fieldId) {
    throw new Error('Both labelId and fieldId are required.');
  }
  PropertiesService.getScriptProperties().setProperty('TAG_LABEL_ID', labelId);
  PropertiesService.getScriptProperties().setProperty('TAG_FIELD_ID', fieldId);
  return 'Saved TAG_LABEL_ID and TAG_FIELD_ID to Script Properties.';
}

// Lists labels visible to the current user (no admin privileges required)
function listUserLabels() {
  var resp = DriveLabels.Users.Labels.list('me', { view: 'LABEL_VIEW_FULL', publishedOnly: false });
  (resp.labels || []).forEach(function(l) {
    var title = l.properties && l.properties.title;
    var labelId = l.id || (l.name ? String(l.name).split('/').pop() : '');
    Logger.log('Label: %s id=%s', title, labelId);
    (l.fields || []).forEach(function(f) {
      var type = f.textOptions ? 'TEXT' : f.selectionOptions ? 'SELECTION' : 'OTHER';
      var fieldId = f.id || (f.name ? String(f.name).split('/').pop() : '');
      Logger.log('  Field: %s id=%s type=%s', f.properties && f.properties.displayName, fieldId, type);
    });
  });
  return 'Check Execution log for label and field IDs.';
}

// Finds a label and text field by their display names and saves their IDs
function setupTagConfigByNames(labelTitle, fieldDisplayName) {
  if (!labelTitle || !fieldDisplayName) {
    throw new Error('labelTitle and fieldDisplayName are required');
  }
  // Try Advanced Service first; fall back to REST if unavailable
  try {
    if (typeof DriveLabels !== 'undefined' && DriveLabels.Users && DriveLabels.Users.Labels && DriveLabels.Users.Labels.list) {
      var resp = DriveLabels.Users.Labels.list('me', { view: 'LABEL_VIEW_FULL', publishedOnly: false });
      var labels = resp.labels || [];
      var foundLabel = labels.find(function(l) { return l.properties && l.properties.title === labelTitle; });
      if (!foundLabel) {
        throw new Error('Label not found with title: ' + labelTitle);
      }
      var fields = foundLabel.fields || [];
      var foundField = fields.find(function(f) {
        return f.textOptions && f.properties && f.properties.displayName === fieldDisplayName;
      });
      if (!foundField) {
        throw new Error('Text field not found with display name: ' + fieldDisplayName);
      }
      var labelId = foundLabel.id || (foundLabel.name ? String(foundLabel.name).split('/').pop() : '');
      var fieldId = foundField.id || (foundField.name ? String(foundField.name).split('/').pop() : '');
      return setTagLabelConfig(labelId, fieldId);
    }
  } catch (e) {
    // fall through to REST
  }
  // REST fallback
  var list = _listUserLabelsViaRest();
  var foundLabel2 = list.find(function(l) { return (l.properties && l.properties.title) === labelTitle; });
  if (!foundLabel2) {
    throw new Error('Label not found with title: ' + labelTitle);
  }
  var foundField2 = (foundLabel2.fields || []).find(function(f) {
    return f.textOptions && f.properties && f.properties.displayName === fieldDisplayName;
  });
  if (!foundField2) {
    throw new Error('Text field not found with display name: ' + fieldDisplayName);
  }
  var labelId2 = foundLabel2.id || (foundLabel2.name ? String(foundLabel2.name).split('/').pop() : '');
  var fieldId2 = foundField2.id || (foundField2.name ? String(foundField2.name).split('/').pop() : '');
  return setTagLabelConfig(labelId2, fieldId2);
}

// REST helper to list user-visible labels (avoids Advanced Service availability issues)
function listUserLabelsRest() {
  var labels = _listUserLabelsViaRest();
  labels.forEach(function(l) {
    var title = l.properties && l.properties.title;
    var labelId = l.id || (l.name ? String(l.name).split('/').pop() : '');
    Logger.log('Label: %s id=%s', title, labelId);
    (l.fields || []).forEach(function(f) {
      var type = f.textOptions ? 'TEXT' : f.selectionOptions ? 'SELECTION' : 'OTHER';
      var fieldId = f.id || (f.name ? String(f.name).split('/').pop() : '');
      Logger.log('  Field: %s id=%s type=%s', f.properties && f.properties.displayName, fieldId, type);
    });
  });
  return 'Check Execution log for label and field IDs.';
}

function _listUserLabelsViaRest() {
  var base = 'https://drivelabels.googleapis.com/v2/users/me/labels';
  var params = {
    view: 'LABEL_VIEW_FULL',
    publishedOnly: 'false',
    pageSize: 200
  };
  var labels = [];
  var pageToken;
  do {
    var url = base + '?' + _toQueryString(Object.assign({}, params, pageToken ? { pageToken: pageToken } : {}));
    var resp = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
    });
    if (resp.getResponseCode() !== 200) {
      throw new Error('Drive Labels API error ' + resp.getResponseCode() + ': ' + resp.getContentText());
    }
    var data = JSON.parse(resp.getContentText());
    labels = labels.concat(data.labels || []);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return labels;
}

function _toQueryString(obj) {
  return Object.keys(obj).map(function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&');
}

// ---------- Shortcut backend helpers ----------

function normalizeTag(tag) {
  if (!tag) return '';
  var t = String(tag).trim();
  if (!t) return '';
  // Replace forward slash which is inconvenient in folder names
  return t.replace(/\//g, '／');
}

function ensureTagsRoot() {
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('TAGS_ROOT_ID');
  if (cached && exists(cached)) return cached;
  // Try to find existing folder by name in My Drive
  var resp = Drive.Files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and name = '" + escapeQueryValue(TAGS_ROOT_NAME) + "' and 'root' in parents and trashed = false",
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });
  var id;
  if (resp.files && resp.files.length) {
    id = resp.files[0].id;
  } else {
    var folder = Drive.Files.create({ name: TAGS_ROOT_NAME, mimeType: 'application/vnd.google-apps.folder', parents: ['root'] }, null, { supportsAllDrives: true });
    id = folder.id;
  }
  props.setProperty('TAGS_ROOT_ID', id);
  return id;
}

function listTagFolders(rootId) {
  var resp = Drive.Files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and '" + rootId + "' in parents and trashed = false",
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });
  var files = resp.files || [];
  // Cache IDs for quick lookup
  var props = PropertiesService.getScriptProperties();
  files.forEach(function(f){ props.setProperty('TAG_FOLDER_' + f.name, f.id); });
  return files;
}

function ensureTagFolder(tag, rootId) {
  var id = getTagFolderId(tag);
  if (id && exists(id)) return id;
  // Try to find by name under root
  var resp = Drive.Files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and name = '" + escapeQueryValue(tag) + "' and '" + rootId + "' in parents and trashed = false",
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });
  if (resp.files && resp.files.length) {
    id = resp.files[0].id;
  } else {
    var folder = Drive.Files.create({ name: tag, mimeType: 'application/vnd.google-apps.folder', parents: [rootId] }, null, { supportsAllDrives: true });
    id = folder.id;
  }
  PropertiesService.getScriptProperties().setProperty('TAG_FOLDER_' + tag, id);
  return id;
}

function getTagFolderId(tag) {
  return PropertiesService.getScriptProperties().getProperty('TAG_FOLDER_' + tag);
}

function ensureShortcut(fileId, parentFolderId) {
  // Check if a shortcut already exists
  var existing = listShortcutsInFolder(parentFolderId);
  var found = existing.find(function(s){ return s.shortcutDetails && s.shortcutDetails.targetId === fileId; });
  if (found) return found.id;
  // Create shortcut
  var resource = {
    name: getFileNameSafe(fileId),
    mimeType: 'application/vnd.google-apps.shortcut',
    parents: [parentFolderId],
    shortcutDetails: { targetId: fileId }
  };
  var created = Drive.Files.create(resource, null, { supportsAllDrives: true });
  return created.id;
}

function removeShortcutsForFileInFolder(fileId, parentFolderId) {
  var shortcuts = listShortcutsInFolder(parentFolderId);
  shortcuts.forEach(function(s){
    if (s.shortcutDetails && s.shortcutDetails.targetId === fileId) {
      try { Drive.Files.update({ trashed: true }, s.id, null, { supportsAllDrives: true }); } catch (e) {}
    }
  });
}

function folderHasShortcutToFile(folderId, fileId) {
  var shortcuts = listShortcutsInFolder(folderId);
  for (var i = 0; i < shortcuts.length; i++) {
    var s = shortcuts[i];
    if (s.shortcutDetails && s.shortcutDetails.targetId === fileId) return true;
  }
  return false;
}

function listShortcutsInFolder(folderId) {
  var resp = Drive.Files.list({
    q: "mimeType = 'application/vnd.google-apps.shortcut' and '" + folderId + "' in parents and trashed = false",
    fields: 'files(id, name, shortcutDetails)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });
  return resp.files || [];
}

function getFileNameSafe(fileId) {
  try {
    var f = Drive.Files.get(fileId, { fields: 'name', supportsAllDrives: true });
    return f && f.name ? f.name : 'Shortcut';
  } catch (e) {
    return 'Shortcut';
  }
}

function exists(fileId) {
  try { Drive.Files.get(fileId, { fields: 'id', supportsAllDrives: true }); return true; } catch (e) { return false; }
}

function escapeQueryValue(val) {
  return String(val).replace(/'/g, "\\'");
}

// ---------- Multi-tag view helpers ----------

function ensureViewsRoot(rootId) {
  // Create/find a _Views folder under Tags root to host temporary views
  var q = "mimeType = 'application/vnd.google-apps.folder' and name = '_Views' and '" + rootId + "' in parents and trashed = false";
  var resp = Drive.Files.list({ q: q, fields: 'files(id,name)', supportsAllDrives: true, includeItemsFromAllDrives: true });
  if (resp.files && resp.files.length) return resp.files[0].id;
  var folder = Drive.Files.create({ name: '_Views', mimeType: 'application/vnd.google-apps.folder', parents: [rootId] }, null, { supportsAllDrives: true });
  return folder.id;
}

function ensureChildFolder(name, parentId) {
  var q = "mimeType = 'application/vnd.google-apps.folder' and name = '" + escapeQueryValue(name) + "' and '" + parentId + "' in parents and trashed = false";
  var resp = Drive.Files.list({ q: q, fields: 'files(id,name)', supportsAllDrives: true, includeItemsFromAllDrives: true });
  if (resp.files && resp.files.length) return resp.files[0].id;
  var folder = Drive.Files.create({ name: name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }, null, { supportsAllDrives: true });
  return folder.id;
}

function buildViewFolderName(tags, mode) {
  // Normalize tags and build a friendly folder name, limit length
  var cleanTags = (tags || []).map(function(t){ return normalizeTag(t); }).filter(Boolean);
  var suffix = mode === 'any' ? 'ANY' : 'ALL';
  var base = cleanTags.join(' & ');
  var name = (base ? base : 'Empty') + ' [' + suffix + ']';
  if (name.length > 200) name = name.slice(0, 197) + '…';
  return name;
}

// Refreshes a temporary view folder for given files; returns folderId
// files: array of { id, name }
function refreshMultiTagView(tags, mode, files) {
  var rootId = ensureTagsRoot();
  var viewsRoot = ensureViewsRoot(rootId);
  var viewName = buildViewFolderName(tags, mode);
  var viewFolderId = ensureChildFolder(viewName, viewsRoot);
  // Clear existing shortcuts
  var existing = listShortcutsInFolder(viewFolderId);
  existing.forEach(function(s){
    try { Drive.Files.update({ trashed: true }, s.id, null, { supportsAllDrives: true }); } catch (e) {}
  });
  // Add shortcuts for result files
  (files || []).forEach(function(f){
    if (f && f.id) ensureShortcut(f.id, viewFolderId);
  });
  return viewFolderId;
}

// Safe re-definition to avoid earlier encoding issue
function normalizeTag(tag) {
  if (!tag) return '';
  var t = String(tag).trim();
  if (!t) return '';
  return t.replace(/\//g, '\uFF0F');
}
