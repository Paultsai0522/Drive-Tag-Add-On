function setTags(fileId, tags) {
  var appProps = { tags: JSON.stringify(tags) };
  Drive.Files.update({appProperties: appProps}, fileId);
}

function getTags(fileId) {
  var file = Drive.Files.get(fileId, {fields: 'appProperties'});
  var tags = [];
  if (file.appProperties && file.appProperties.tags) {
    try {
      tags = JSON.parse(file.appProperties.tags);
    } catch (err) {}
  }
  return tags;
}
