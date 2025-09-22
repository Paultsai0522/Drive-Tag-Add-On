function showSidebar(e) {
  var fileId = '';
  var fileName = '';
  var tags = '';
  if (e && e.drive && e.drive.selectedItems && e.drive.selectedItems.length > 0) {
    fileId = e.drive.selectedItems[0].id;
    fileName = e.drive.selectedItems[0].title;
    try {
      tags = getTags(fileId).join(', ');
    } catch (err) {
      Logger.log('Failed to load tags for %s: %s', fileId, err);
    }
  }
  return buildMainCard(fileId, tags, fileName);
}

function onDriveItemsSelected(e) {
  var fileId = '';
  var fileName = '';
  var tags = '';
  if (e && e.drive && e.drive.selectedItems && e.drive.selectedItems.length > 0) {
    fileId = e.drive.selectedItems[0].id;
    fileName = e.drive.selectedItems[0].title;
    try {
      tags = getTags(fileId).join(', ');
    } catch (err) {
      Logger.log('Failed to load tags for %s: %s', fileId, err);
    }
  }
  return buildMainCard(fileId, tags, fileName);
}

function buildMainCard(fileId, tags, fileName) {
    if (fileId && !fileName) {
      try {
        fileName = Drive.Files.get(fileId, {fields: 'name', supportsAllDrives: true}).name;
      } catch (err) {}
    }
  var card = CardService.newCardBuilder();

  var section = CardService.newCardSection();

  if (fileName) {
    section.addWidget(CardService.newKeyValue()
        .setTopLabel('Selected file')
        .setContent(fileName));
  }

  var fileIdInput = CardService.newTextInput()
      .setFieldName('fileId')
      .setTitle('File ID');
  if (fileId) {
    fileIdInput.setValue(fileId);
  }
  section.addWidget(fileIdInput);

  var tagsInput = CardService.newTextInput()
      .setFieldName('tags')
      .setTitle('Tags (comma-separated)');
  if (tags) {
    tagsInput.setValue(tags);
  }
  section.addWidget(tagsInput);

  var loadTagsButton = CardService.newTextButton()
      .setText('Load Tags')
      .setOnClickAction(CardService.newAction().setFunctionName('loadTags'));

  var saveTagsButton = CardService.newTextButton()
      .setText('Save Tags')
      .setOnClickAction(CardService.newAction().setFunctionName('saveTags'));

  section.addWidget(CardService.newButtonSet()
      .addButton(loadTagsButton)
      .addButton(saveTagsButton));

  var searchInput = CardService.newTextInput()
      .setFieldName('searchTag')
      .setTitle('Search Tag')
      .setHint('Enter tag to search for');
  section.addWidget(searchInput);

  var searchButton = CardService.newTextButton()
      .setText('Search')
      .setOnClickAction(CardService.newAction().setFunctionName('searchByTagAction'));
  section.addWidget(searchButton);

  card.addSection(section);
  return card.build();
}

function loadTags(e) {
  var fileId = getFormValue(e, 'fileId');
  var tags = '';
  try {
    tags = getTags(fileId).join(', ');
  } catch (err) {
    var errorNotif = CardService.newNotification().setText('Failed to load tags: ' + err.message);
    return CardService.newActionResponseBuilder().setNotification(errorNotif).build();
  }
  var nav = CardService.newNavigation().updateCard(buildMainCard(fileId, tags));
  return CardService.newActionResponseBuilder().setNavigation(nav).build();
}

function saveTags(e) {
  var fileId = getFormValue(e, 'fileId');
  var tagsStr = getFormValue(e, 'tags');
  var tags = tagsStr ? tagsStr.split(',').map(function(t){ return t.trim(); }).filter(String) : [];
  try {
    setTags(fileId, tags);
  } catch (err) {
    var errorNotif = CardService.newNotification().setText('Failed to save tags: ' + err.message);
    return CardService.newActionResponseBuilder().setNotification(errorNotif).build();
  }
  var labelInfo = {};
  try {
    labelInfo = Drive.Files.get(fileId, {
      fields: 'labelInfo',
      includeLabels: TAG_LABEL_ID,
      supportsAllDrives: true
    }).labelInfo || {};
  } catch (err) {}
  Logger.log('Saved labels for %s: %s', fileId, JSON.stringify(labelInfo));
  var notif = CardService.newNotification().setText('Tags saved');
  return CardService.newActionResponseBuilder().setNotification(notif).build();
}

function searchByTagAction(e) {
  var tag = getFormValue(e, 'searchTag');
  var files;
  try {
    files = searchByTag(tag);
  } catch (err) {
    var errorNotif = CardService.newNotification().setText('Search failed: ' + err.message);
    return CardService.newActionResponseBuilder().setNotification(errorNotif).build();
  }
  var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Search Results'));
  var section = CardService.newCardSection();
  var driveUrl = 'https://drive.google.com/drive/search?q=' + encodeURIComponent(tag);
  section.addWidget(CardService.newTextButton()
      .setText('View in Drive')
      .setOpenLink(CardService.newOpenLink().setUrl(driveUrl).setOpenAs(CardService.OpenAs.NEW_TAB)));
  if (files.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText('No files found'));
  } else {
      files.forEach(function(file) {
        var btn = CardService.newTextButton()
            .setText(file.name)
            .setOpenLink(CardService.newOpenLink().setUrl('https://drive.google.com/file/d/' + file.id + '/view'));
        section.addWidget(btn);
      });
  }
  card.addSection(section);
  var nav = CardService.newNavigation().pushCard(card.build());
  return CardService.newActionResponseBuilder().setNavigation(nav).build();
}

function getFormValue(e, name) {
  if (e.formInput && e.formInput[name] !== undefined) {
    return e.formInput[name];
  }
  if (e.commonEventObject && e.commonEventObject.formInputs && e.commonEventObject.formInputs[name]) {
    var inputs = e.commonEventObject.formInputs[name];
    if (inputs.stringInputs && inputs.stringInputs.value && inputs.stringInputs.value.length > 0) {
      return inputs.stringInputs.value[0];
    }
  }
  return '';
}
