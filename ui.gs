function showSidebar(e) {
  var fileId = '';
  var fileName = '';
  var tags = '';
  if (!e || !e.drive || !e.drive.selectedItems || e.drive.selectedItems.length === 0) {
    // No selection: reset sidebar to default empty state
    return buildMainCard('', '', '');
  }
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
  if (!e || !e.drive || !e.drive.selectedItems || e.drive.selectedItems.length === 0) {
    // No selection: reset sidebar to default empty state
    return buildMainCard('', '', '');
  }
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

  // Render existing tags as buttons
  var tagList = [];
  if (tags) {
    if (Array.isArray(tags)) {
      tagList = tags;
    } else if (typeof tags === 'string') {
      tagList = tags.split(',').map(function(t){ return t.trim(); }).filter(function(t){ return !!t; });
    }
  }
  if (tagList.length) {
    var tagButtons = CardService.newButtonSet();
    var rootId;
    try { rootId = ensureTagsRoot(); } catch (e) { rootId = null; }
    tagList.forEach(function(tag) {
      var btn = CardService.newTextButton().setText(tag);
      try {
        var folderId = rootId ? ensureTagFolder(normalizeTag(tag), rootId) : null;
        if (folderId) {
          btn.setOpenLink(
            CardService.newOpenLink()
              .setUrl('https://drive.google.com/drive/folders/' + folderId)
              .setOpenAs(CardService.OpenAs.NEW_TAB)
          );
        }
      } catch (e) {}
      tagButtons.addButton(btn);
    });
    section.addWidget(tagButtons);
  } else {
    section.addWidget(CardService.newTextParagraph().setText('No tags yet'));
  }

  // Add new tag input + button
  var newTagInput = CardService.newTextInput()
      .setFieldName('newTag')
      .setTitle('Add a tag');
  section.addWidget(newTagInput);

  var addTagButton = CardService.newTextButton()
      .setText('Add Tag')
      .setOnClickAction(CardService.newAction().setFunctionName('addTagAction'));

  section.addWidget(CardService.newButtonSet().addButton(addTagButton));

  var searchInput = CardService.newTextInput()
      .setFieldName('searchTag')
      .setTitle('Search Tags')
      .setHint('Enter tags separated by plus (+), e.g., alpha+beta')
      .setOnChangeAction(CardService.newAction().setFunctionName('searchByTagAction'));
  section.addWidget(searchInput);

  // Multi-tag search defaults to ALL (AND). No UI selector for now.
  // Search is triggered by pressing Enter in the input (onChangeAction).

  card.addSection(section);
  return card.build();
}

function loadTags(e) {
  var fileId = getFormValue(e, 'fileId');
  var tags = '';
  try {
    tags = getTags(fileId);
  } catch (err) {
    var errorNotif = CardService.newNotification().setText('Failed to load tags: ' + err.message);
    return CardService.newActionResponseBuilder().setNotification(errorNotif).build();
  }
  var nav = CardService.newNavigation().updateCard(buildMainCard(fileId, tags));
  return CardService.newActionResponseBuilder().setNavigation(nav).build();
}

function addTagAction(e) {
  var fileId = getFormValue(e, 'fileId');
  var newTag = getFormValue(e, 'newTag');
  if (!fileId) {
    var errorNotif = CardService.newNotification().setText('File ID is required');
    return CardService.newActionResponseBuilder().setNotification(errorNotif).build();
  }
  var current = [];
  try { current = getTags(fileId); } catch (err) { current = []; }
  if (newTag) {
    var norm = normalizeTag(newTag);
    if (norm && current.indexOf(norm) === -1) {
      current.push(norm);
    }
  }
  try {
    setTags(fileId, current);
  } catch (err) {
    var errorNotif2 = CardService.newNotification().setText('Failed to add tag: ' + err.message);
    return CardService.newActionResponseBuilder().setNotification(errorNotif2).build();
  }
  var nav = CardService.newNavigation().updateCard(buildMainCard(fileId, current));
  var notif = CardService.newNotification().setText('Tag added');
  return CardService.newActionResponseBuilder().setNavigation(nav).setNotification(notif).build();
}

function removeTagAction(e) {
  var fileId = getFormValue(e, 'fileId');
  var tag = getParam(e, 'tag');
  if (!fileId || !tag) {
    var errorNotif = CardService.newNotification().setText('Missing file or tag');
    return CardService.newActionResponseBuilder().setNotification(errorNotif).build();
  }
  var current = [];
  try { current = getTags(fileId); } catch (err) { current = []; }
  var next = current.filter(function(t){ return t !== tag; });
  try {
    setTags(fileId, next);
  } catch (err) {
    var errorNotif2 = CardService.newNotification().setText('Failed to remove tag: ' + err.message);
    return CardService.newActionResponseBuilder().setNotification(errorNotif2).build();
  }
  var nav = CardService.newNavigation().updateCard(buildMainCard(fileId, next));
  var notif = CardService.newNotification().setText('Tag removed');
  return CardService.newActionResponseBuilder().setNavigation(nav).setNotification(notif).build();
}

function searchByTagAction(e) {
  var raw = getFormValue(e, 'searchTag');
  var tags = raw ? raw.split(/\s*\+\s*/).map(function(t){ return t.trim(); }).filter(Boolean) : [];
  var openUrl = '';
  try {
    if (tags.length <= 1) {
      // Single tag: open tag folder directly
      var root = ensureTagsRoot();
      var tagName = normalizeTag(tags[0] || '');
      if (tagName) {
        var folderId = ensureTagFolder(tagName, root);
        openUrl = 'https://drive.google.com/drive/folders/' + folderId;
      }
    } else {
      // Multi-tag: compute results, refresh view folder, open it
      var files = searchByTags(tags, 'all');
      var viewFolderId = refreshMultiTagView(tags, 'all', files);
      openUrl = 'https://drive.google.com/drive/folders/' + viewFolderId;
    }
  } catch (err) {
    var errorNotif = CardService.newNotification().setText('Search failed: ' + err.message);
    return CardService.newActionResponseBuilder().setNotification(errorNotif).build();
  }

  var builder = CardService.newActionResponseBuilder();
  if (openUrl) {
    builder.setOpenLink(CardService.newOpenLink().setUrl(openUrl).setOpenAs(CardService.OpenAs.NEW_TAB));
  }
  // Keep the sidebar unchanged (no navigation changes)
  return builder.build();
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

function getParam(e, name) {
  if (e && e.parameters && e.parameters[name] !== undefined) {
    return e.parameters[name];
  }
  if (e && e.commonEventObject && e.commonEventObject.parameters && e.commonEventObject.parameters[name] !== undefined) {
    return e.commonEventObject.parameters[name];
  }
  return '';
}
