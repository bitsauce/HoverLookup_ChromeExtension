var DEBUG = false;

var pressedKeys = {};
var mousePagePosition = {};
var mouseClientPosition = {};
var popup = null;

var POPUP_WIDTH = 564;
var POPUP_HEIGHT = 284;
var POPUP_WAITING_WIDTH = 220;
var POPUP_WAITING_HEIGHT = 57;


function documentMouseMove(event) {
	// Store mouse position
	mousePagePosition = {top:event.pageY, left:event.pageX};
	mouseClientPosition = {top:event.clientY, left:event.clientX};
}

function openInNewTab(url) {
	window.open(url, '_blank').focus();
}

function getSelectionText() {
    var text = "";
    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }
    return text;
}

function walkTheDOM(node, func) {
    func(node);
    node = node.firstChild;
    while (node) {
        walkTheDOM(node, func);
        node = node.nextSibling;
    }
}

function lookupWord(word, initialPosition) {
	// Make sure popup is empty
	popup.empty();
	
	// Show "Please wait" while parsing API results
	popup.append($('<span class="hd_ext_language_header">Please wait...</span>'));
	
	// Resize and move popup so it is inside the viewport
	var position = { top: initialPosition.top, left: initialPosition.left };
	position.left = Math.min(position.left + 10, document.body.scrollWidth - POPUP_WAITING_WIDTH - 40);
	position.top = Math.min(position.top + 10, document.body.scrollHeight - POPUP_WAITING_HEIGHT - 40);
	popup.css({"top": Math.round(position.top), "left": Math.round(position.left), "max-width": POPUP_WAITING_WIDTH, "min-width": POPUP_WAITING_WIDTH, "max-height": POPUP_WAITING_HEIGHT, "min-height": POPUP_WAITING_HEIGHT});

	// Get available languages.
	var languages = null;
	chrome.storage.local.get('lang_list', function(properties) {
		if (DEBUG == true) console.log('lang_list: ' + properties['lang_list']);
		languages = properties['lang_list'];
	});
	
	// Make API call
	word = word.toLowerCase();
	var apiUrl = 'http://en.wiktionary.org/w/api.php?action=parse&format=json&prop=text&disabletoc=true&page=' + word;
	chrome.runtime.sendMessage({action:'getJSON', url:apiUrl},
		function(json) {
			if (!json.hasOwnProperty("error")) {
				// Create dummy element with result from API
				var wikiEntry = $('<div></div>');
				wikiEntry.html(json.parse.text['*']);
				var wikiInfo = wikiEntry[0].children[0]; // Get the wiki HTML
				
				// Result map
				var results = {};
				
				// Word entry
				var entry = null;
				function Entry(type) {
					this.type = type;
					this.definitions = [];
				}
				
				// Search state enum
				var SearchState = {
					FIND_LANGUAGE: 1,
					FIND_NEW_SECTION: 2,
					FIND_PRONUNCIATION: 3,
					FIND_DEFINITIONS: 4,
				}
				
				var state = SearchState.FIND_LANGUAGE;
				var language = "";

				for (var i = 0; i < wikiInfo.children.length; i++) {
					var child = wikiInfo.children[i];
					switch(state) {
						case SearchState.FIND_LANGUAGE: {
							// The next headline we find is the language
							if(child.children.length > 0 && child.children[0].className == "mw-headline") {
								language = child.textContent.substr(0, child.textContent.length - 6);
								state = SearchState.FIND_NEW_SECTION;
							
								// Skip if language is not included
								if (languages.length == 0 || languages.includes(language.toLowerCase())) {
									// Add language to map if it doesn't exist
									if(!(language in results)) {
										results[language] = {
											pronunciation: null,
											entries: []
										}
									}	
								}
								
								if(DEBUG == true) console.log("Current language:", language);
							}
						}
						break;
						
						case SearchState.FIND_NEW_SECTION: {
							// Add entry
							if(entry != null) {
								if (language in results)
									results[language].entries.push(entry);
								
								if(DEBUG == true) console.log("Entry added:", entry);
								
								entry = null;
							}
							
							// Find the next headline
							if(child.children.length > 0 && child.children[0].className == "mw-headline") {
								// What section is this?
								var sectionName = child.children[0].textContent;
								
								if(sectionName == "Pronunciation") {
									state = SearchState.FIND_PRONUNCIATION;
								}
								else if(sectionName == "Noun" || sectionName == "Verb" || sectionName == "Adjective" || sectionName == "Adverb" || sectionName == "Pronoun" || sectionName == "Preposition" || sectionName == "Conjunction" || sectionName == "Determiner") {
									state = SearchState.FIND_DEFINITIONS;
									entry = new Entry(sectionName);
								}
								
								if(state == SearchState.FIND_NEW_SECTION) {
									if(DEBUG == true) console.log("Section ignored:", sectionName);
								}
								else {
									if(DEBUG == true) console.log("Section entered:", sectionName);
								}
							}
							else if(child.tagName == "HR") {
								// End of entries for this language
								state = SearchState.FIND_LANGUAGE;
							}
						}
						break;
						
						case SearchState.FIND_PRONUNCIATION: {
							// Find and store pronunciation
							if(child.tagName == "UL" && child.children[0].tagName == "LI") {
								var ipa = child.children[0].getElementsByClassName("IPA");
								if(language in results && ipa.length > 0) {
									results[language].pronunciation = ipa[0].textContent;
								}
								state = SearchState.FIND_NEW_SECTION;
								
								if(language in results && DEBUG == true) console.log("Pronunciation found:", results[language].pronunciation);
							}
						}
						break;
						
						case SearchState.FIND_DEFINITIONS: {
							if(child.tagName == "OL") {
								for(var j = 0; j < child.children.length; j++) {
									var listEntryChild = child.children[j];
									
									// Parse list entry content
									for(var k = listEntryChild.children.length - 1; k >= 0; k--) {
										var listContentElement = listEntryChild.children[k];
										
										// Remove long text elements
										if(listContentElement.className == "HQToggle" || listContentElement.tagName == "UL") {
											listEntryChild.removeChild(listContentElement);
										}
									}
									entry.definitions.push(listEntryChild);
								}
								
								// Modify hyperlinks
								walkTheDOM(child, function(node) {
									// Change links so that when clicked, they will display the definition for the word clicked in the popup
									if(node.tagName == "A") {
										if(node.hasAttribute("href")) {
											var redirectWord = node.getAttribute("href").replace("/wiki/", "");
											
											// Remove href parameters
											if(redirectWord.indexOf("#") > 0) {
												redirectWord = redirectWord.substr(0, redirectWord.indexOf("#"));
											}
											
											node.redirectWord = redirectWord;
											node.removeAttribute("href");
											node.addEventListener('click', function(e) {
												lookupWord(e.target.redirectWord, initialPosition);
											});
										}
									}
								});
									
								state = SearchState.FIND_NEW_SECTION;
							}
						}
					}
				}

				// Add entry
				if(language in results && entry != null) {
					results[language].entries.push(entry);
					
					if(DEBUG == true) console.log("Entry added:", entry);
				}
				
				popup.empty();
				
				// Create popup HTML
				for(var key in results) {
					if(results.hasOwnProperty(key)) {
						// Language
						$('<span class="hd_ext_language_header">' + key + '</span>').appendTo(popup);
						
						// Create entry header
						var header = $('<div class="hd_ext_header"></div>').appendTo(popup);
						var headerText = $('<a class="hd_ext_header_text">' + word + '</a>').appendTo(header);
						headerText.click(function() {
							openInNewTab('http://en.wiktionary.org/wiki/' + word);
						});
						
						if(results[key].pronunciation != null) {
							header.append($('<span class="hd_ext_header_pronunciation">' + results[key].pronunciation + '</span>'));
						}
						
						for(var i = 0; i < results[key].entries.length; i++) {
							$('<span class="hd_ext_word_class">' + results[key].entries[i].type + '</span>').appendTo(popup);
							var list = $('<ol></ol>').appendTo(popup);
							for(var j = 0; j < results[key].entries[i].definitions.length; j++) {
								/*var def = results[key].entries[i].definitions[j];
								var listEntry = $('<li></li>');
								if(def.charAt(0) == "(" && def.indexOf(")") > 0) {
									listEntry.append($('<span class="hd_ext_glossary_text">' + def.substr(0, def.indexOf(")") + 1) + '</span>'));
									def = def.substr(def.indexOf(")") + 1);
								}
								listEntry.append($('<span class="hd_ext_bullet_list_entry_text">' + def + '</span>'));
								list.append(listEntry);*/
								list.append(results[key].entries[i].definitions[j]);
							}
						}
					}
				}
				
				// Resize and move popup so it is inside the viewport
				var position = { top: initialPosition.top, left: initialPosition.left };
				position.left = Math.min(position.left + 10, document.body.scrollWidth - POPUP_WIDTH - 40);
				position.top = Math.min(position.top + 10, document.body.scrollHeight - POPUP_HEIGHT - 40);
				popup.css({"top": Math.round(position.top), "left": Math.round(position.left), "max-width": POPUP_WIDTH, "min-width": POPUP_WIDTH, "max-height": POPUP_HEIGHT, "min-height": POPUP_HEIGHT});
			} else {
				popup.html($('<span class="hd_ext_language_header">Definition for <i>' + word + '</i> not found</span>'));
			}
		});
}

function documentKeyDown(event) {
	pressedKeys[event.keyCode] = true;
	if(pressedKeys[16] && pressedKeys[17]) {
		// close existing popup
		closePopup();

		// Get selected text
		var word = getSelectionText();
		
		// If no text is selected, use word under cursor
		if(word == "") {
			word = getFullWord(mouseClientPosition);
		}
		
		// Return the word the cursor is over
		if(word != "") {
			// Create popup
			popup = $('<div id="hoverdict"></div>').appendTo(document.body);
			
			// Get word definition
			lookupWord(word, { top:mousePagePosition.top, left:mousePagePosition.left });
		
			// Show popup
			popup.stop(true, true).fadeTo(100, 1.0);
		}
	}
}

function documentKeyUp(event) {
	pressedKeys[event.keyCode] = false;
}

function closePopup() {
	if(popup != null && !popup[0].contains(event.target)) {
		popup.stop(true, true).fadeOut(0,
			function() {
				// When animation is done, remove the popup
				popup.remove();
				popup = null;
			}
		);
	}
}

function documentMouseDown(event) {
	closePopup();
}

$(document).mousemove(documentMouseMove).keydown(documentKeyDown).keyup(documentKeyUp).mousedown(documentMouseDown);
