loadOptions();

document.getElementById('save_options').addEventListener('click', saveOptions);

function loadOptions() {
  chrome.storage.local.get('lang_list', function(properties) {
    console.log('lang_list: ' + properties['lang_list'])

    properties['lang_list'].forEach(function(value, index, array) {
      document.getElementById(value).checked = true;
    });
  })
  $('body').css("visibility","visible");
}

function saveOptions() {
  var langList = $("input[name='lang']:checked").toArray().map(function getId(e) { return e.id} )
  chrome.storage.local.set({'lang_list': langList}, function() {
      console.log('lang_list set to: ' + langList)
    })
  alert("Options saved!");
}