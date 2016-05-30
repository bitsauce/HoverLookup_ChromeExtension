function onMessage(request, sender, callback) {
	if (request.action == 'getJSON') {
		$.getJSON(request.url, callback);
		return true;
	}
}

chrome.runtime.onMessage.addListener(onMessage);