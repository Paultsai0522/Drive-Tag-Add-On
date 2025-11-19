function searchByTag(tag) {
  if (!tag) return [];
  tag = normalizeTag(tag);
  var rootId = ensureTagsRoot();
  var folderId = ensureTagFolder(tag, rootId);
  // List shortcuts in the tag folder and return target files
  var shortcuts = listShortcutsInFolder(folderId);
  var files = [];
  shortcuts.forEach(function(s) {
    var targetId = s.shortcutDetails && s.shortcutDetails.targetId;
    if (targetId) {
      var name;
      try { name = Drive.Files.get(targetId, { fields: 'name', supportsAllDrives: true }).name; } catch (e) { name = '(unknown)'; }
      files.push({ id: targetId, name: name });
    }
  });
  return files;
}

// Multi-tag search.
// tags: array of tag strings. mode: 'all' (AND) or 'any' (OR)
function searchByTags(tags, mode) {
  if (!tags || !tags.length) return [];
  var rootId = ensureTagsRoot();
  // Build sets of target file IDs per tag
  var sets = [];
  tags.forEach(function(t) {
    var tag = normalizeTag(t);
    if (!tag) return;
    var folderId = ensureTagFolder(tag, rootId);
    var ids = {};
    var shortcuts = listShortcutsInFolder(folderId);
    shortcuts.forEach(function(s) {
      var targetId = s.shortcutDetails && s.shortcutDetails.targetId;
      if (targetId) ids[targetId] = true;
    });
    sets.push(ids);
  });
  if (!sets.length) return [];
  // Combine sets
  var resultIds = {};
  var first = true;
  if (mode === 'any') {
    sets.forEach(function(s) { for (var id in s) { resultIds[id] = true; } });
  } else {
    // AND
    var base = sets[0];
    for (var id in base) {
      var inAll = true;
      for (var i = 1; i < sets.length; i++) {
        if (!sets[i][id]) { inAll = false; break; }
      }
      if (inAll) resultIds[id] = true;
    }
  }
  // Resolve names
  var files = [];
  for (var id in resultIds) {
    var name;
    try { name = Drive.Files.get(id, { fields: 'name', supportsAllDrives: true }).name; } catch (e) { name = '(unknown)'; }
    files.push({ id: id, name: name });
  }
  // Sort by name for stable display
  files.sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
  return files;
}