function searchByTag(tag) {
  if (!tag) {
    return [];
  }
  ensureLabelConfig();
  var files = [];
  var pageToken;
  do {
    var resp = Drive.Files.list({
      q: "trashed = false",
      fields: 'nextPageToken, files(id, name, labelInfo)',
      includeLabels: TAG_LABEL_ID,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageToken: pageToken
    });
    if (resp.files && resp.files.length) {
      resp.files.forEach(function(item) {
        var tagList = [];
        if (item.labelInfo && item.labelInfo.labels) {
          item.labelInfo.labels.forEach(function(label) {
            if (label.labelId === TAG_LABEL_ID && label.fields) {
              label.fields.forEach(function(field) {
                var values = extractTagValuesFromField(field);
                if (values.length) {
                  tagList = values;
                }
              });
            }
          });
        }
        if (tagList.indexOf(tag) !== -1) {
          files.push({id: item.id, name: item.name});
        }
      });
    }
    pageToken = resp.nextPageToken;
  } while (pageToken);
  return files;
}
