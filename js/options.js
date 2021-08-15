loadOptions();

document.getElementById('save_options').addEventListener('click', saveOptions);

function loadOptions() {
  chrome.storage.local.get('lang_list', function(properties) {
    console.log('lang_list: ' + properties['lang_list'])

    var langList = properties['lang_list']
    if (langList == undefined || langList.length == 0) {
      langList = $("input[name='lang']").toArray().map(function getId(e) { return e.id} );
    }
    langList.forEach(function(value, index, array) {
      document.getElementById(value).checked = true;
    });
  })
  $('body').attr("hidden", false);
}

function saveOptions() {
  var langList = $("input[name='lang']:checked").toArray().map(function getId(e) { return e.id} );
  display_all_languages = langList.length == 0;
  if (display_all_languages) {
    langList = $("input[name='lang']").toArray().map(function getId(e) { return e.id} );
    langList.forEach(function(value, index, array) {
      document.getElementById(value).checked = true;
    });
  }
  chrome.storage.local.set({'lang_list': langList}, function() {
    console.log('lang_list set to: ' + langList);
  })
  setTimeout(function() {  alert("Options saved!"); }, 100);
}