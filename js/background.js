function onMessage(request, sender, callback) {
	if (request.action == 'getJSON') {
		$.getJSON(request.url, callback);
		return true;
	}
}

chrome.runtime.onMessage.addListener(onMessage);

chrome.runtime.onInstalled.addListener(details => {
	chrome.storage.local.set({'lang_list': []}, function() {
    	console.log('lang_list set to: ' + []);
  	});
});