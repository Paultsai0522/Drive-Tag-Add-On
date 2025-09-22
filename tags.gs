var TAG_LABEL_ID = 'YOUR_LABEL_ID';
var TAG_FIELD_ID = 'YOUR_FIELD_ID';

function ensureLabelConfig() {
  if (!TAG_LABEL_ID || TAG_LABEL_ID === 'YOUR_LABEL_ID') {
    throw new Error('TAG_LABEL_ID must be set to your Drive label ID.');
  }
  if (!TAG_FIELD_ID || TAG_FIELD_ID === 'YOUR_FIELD_ID') {
    throw new Error('TAG_FIELD_ID must be set to your Drive label field ID.');
  }
}

function setTags(fileId, tags) {
  ensureLabelConfig();
  if (!fileId) {
    throw new Error('File ID is required to save tags.');
  }
  // Normalize tags
  tags = (tags || []).map(function(t){ return (t || '').trim(); }).filter(function(t){ return !!t; });

  // Build a Drive Labels modify request. Use typed setters for Text fields.
  var request;
  if (tags.length) {
    request = {
      labelId: TAG_LABEL_ID,
      fieldModifications: [
        { fieldId: TAG_FIELD_ID, setTextValues: tags }
      ]
    };
  } else {
    // Clear all values for the field
    request = {
      labelId: TAG_LABEL_ID,
      fieldModifications: [
        { fieldId: TAG_FIELD_ID, unsetValues: true }
      ]
    };
  }

  var body = { requests: [ request ] };
  Logger.log('[setTags] fileId=%s', fileId);
  Logger.log('[setTags] tags=%s', JSON.stringify(tags));
  Logger.log('[setTags] request body=%s', JSON.stringify(body));
  var resp = Drive.Files.modifyLabels(body, fileId);
  Logger.log('[setTags] modifyLabels response=%s', JSON.stringify(resp));
}

function extractTagValuesFromField(field) {
  if (!field || field.fieldId !== TAG_FIELD_ID) {
    return [];
  }
  if (field.stringValues && field.stringValues.length) {
    return field.stringValues.slice();
  }
  if (field.text && field.text.values && field.text.values.length) {
    return field.text.values
        .map(function(entry) { return entry && entry.value; })
        .filter(function(value) { return value; });
  }
  return [];
}

function getTags(fileId) {
  if (!fileId) {
    return [];
  }
  ensureLabelConfig();
  var file = Drive.Files.get(fileId, {
    fields: 'labelInfo',
    includeLabels: TAG_LABEL_ID,
    supportsAllDrives: true
  });
  var tags = [];
  if (file.labelInfo && file.labelInfo.labels) {
    file.labelInfo.labels.forEach(function(label) {
      if (label.labelId === TAG_LABEL_ID && label.fields) {
        label.fields.forEach(function(field) {
          var values = extractTagValuesFromField(field);
          if (values.length) {
            tags = values;
          }
        });
      }
    });
  }
  return tags;
}
