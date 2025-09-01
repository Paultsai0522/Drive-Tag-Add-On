function searchByTag(tag) {
  if (!tag) {
    return [];
  }
  var files = [];
  var pageToken;
  do {
    var resp = Drive.Files.list({
      q: "trashed = false",
      fields: 'nextPageToken, files(id, name, appProperties)',
      pageToken: pageToken
    });
    if (resp.files && resp.files.length) {
      resp.files.forEach(function(item) {
        if (item.appProperties && item.appProperties.tags) {
          var tagList = [];
          try {
            tagList = JSON.parse(item.appProperties.tags);
          } catch (err) {
            tagList = [];
          }
          if (tagList.indexOf(tag) !== -1) {
            files.push({id: item.id, name: item.name});
          }
        }
      });
    }
    pageToken = resp.nextPageToken;
  } while (pageToken);
  return files;
}
