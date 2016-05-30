var pressedKeys = {};
var hoveredWord = "", shownWord = "-1";
var mousePos = {};
var popup = $('<div id="defpopup"></div>').appendTo(document.body);

var popupCss = {
	'border':'1px solid #e3e3e3',
	'overflow':'hidden',
	'padding':'2px',
	'margin':0,
	'position':'absolute',
	'z-index':2147483647,
	'border-radius':'3px',
	'opacity':'0.0',
	'background':'linear-gradient(to right bottom, #ffffff, #ffffff 50%, #ededed)',
	'box-shadow':'3px 3px 9px 5px rgba(0,0,0,0.33)'
};
popup.css(popupCss);

function documentMouseMove(event) {
	// Move popup
	var position = {top:mousePos.top, left:mousePos.left};
	position.top += 10;
	position.left += 10;
	popup.css({top:Math.round(position.top), left:Math.round(position.left)});
	
	// Return the word the cursor is over
	hoveredWord = getFullWord(event);
	mousePos = {top:event.pageY, left:event.pageX};
}


// Calculate optimal image position and size
/*function posImg(position) {
	if (!imgFullSize) {
		return;
	}

	if (position === undefined || position.top === undefined || position.left === undefined) {
		position = {top:mousePos.top, left:mousePos.left};
	}

	var offset = 20,
		padding = 10,
		statusBarHeight = 15,
		wndWidth = window.innerWidth,
		wndHeight = window.innerHeight,
		wndScrollLeft = (document.documentElement && document.documentElement.scrollLeft) || document.body.scrollLeft,
		wndScrollTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop,
		bodyWidth = document.body.clientWidth,
		displayOnRight = (position.left - wndScrollLeft < wndWidth / 2);

	function posCaption() {
		if (hzCaption) {
			hzCaption.css('max-width', imgFullSize.width());
			if (hzCaption.height() > 20) {
				hzCaption.css('font-weight', 'normal');
			}
			// This is looped 10x max just in case something
			// goes wrong, to avoid freezing the process.
			var i = 0;
			while (hz.hzImg.height() > wndHeight - statusBarHeight && i++ < 10) {
				imgFullSize.height(wndHeight - padding - statusBarHeight - hzCaption.height()).width('auto');
				hzCaption.css('max-width', imgFullSize.width());
			}
		}
	}

	if (displayOnRight) {
		position.left += offset;
	} else {
		position.left -= offset;
	}

	if (hz.imgLoading) {
		position.top -= 10;
		if (!displayOnRight) {
			position.left -= 25;
		}
	} else {
		var fullZoom = options.mouseUnderlap || fullZoomKeyDown;

		imgFullSize.width('auto').height('auto');

		// Image natural dimensions
		imgDetails.naturalWidth = imgFullSize.width() * options.zoomFactor;
		imgDetails.naturalHeight = imgFullSize.height() * options.zoomFactor;
		if (!imgDetails.naturalWidth || !imgDetails.naturalHeight) {
			return;
		}

		// Width adjustment
		if (fullZoom) {
			imgFullSize.width(Math.min(imgDetails.naturalWidth, wndWidth - padding + wndScrollLeft));
		} else {
			if (displayOnRight) {
				if (imgDetails.naturalWidth + padding > wndWidth - position.left) {
					imgFullSize.width(wndWidth - position.left - padding + wndScrollLeft);
				}
			} else {
				if (imgDetails.naturalWidth + padding > position.left) {
					imgFullSize.width(position.left - padding - wndScrollLeft);
				}
			}
		}

		// Height adjustment
		if (hz.hzImg.height() > wndHeight - padding - statusBarHeight) {
			imgFullSize.height(wndHeight - padding - statusBarHeight).width('auto');
		}

		posCaption();

		position.top -= hz.hzImg.height() / 2;

		// Display image on the left side if the mouse is on the right
		if (!displayOnRight) {
			position.left -= hz.hzImg.width() + padding;
		}

		// Horizontal position adjustment if full zoom
		if (fullZoom) {
			if (displayOnRight) {
				position.left = Math.min(position.left, wndScrollLeft + wndWidth - hz.hzImg.width() - padding);
			} else {
				position.left = Math.max(position.left, wndScrollLeft);
			}
		}

		// Vertical position adjustments
		var maxTop = wndScrollTop + wndHeight - hz.hzImg.height() - padding - statusBarHeight;
		if (position.top > maxTop) {
			position.top = maxTop;
		}
		if (position.top < wndScrollTop) {
			position.top = wndScrollTop;
		}

		if (options.ambilightEnabled) {
			updateAmbilight();
		}
	}

	// This fixes positioning when the body's width is not 100%
	if (body100pct) {
		position.left -= (wndWidth - bodyWidth) / 2;
	}

	hz.hzImg.css({top:Math.round(position.top), left:Math.round(position.left)});
}*/

function createDefinition(word) {
	word = word.toLowerCase();
	var apiUrl = 'http://en.wiktionary.org/w/api.php?action=parse&format=json&prop=text&disabletoc=true&page=' + word;
	chrome.runtime.sendMessage({action:'getJSON', url:apiUrl},
		function(json) {
			if (!json.hasOwnProperty("error")) {
				var text = json.parse.text['*'];
				popup.html(text);

				var wikiInfo = popup[0];
				var wordInfo = null;

				var i = 0;
				while (wikiInfo.children.length > 1) {
					var child = wikiInfo.children[i];
					if (wordInfo != null || child.tagName != "OL") {
						wikiInfo.removeChild(child);
					} else {
						wordInfo = child;
						i++;
					}
				}


				for (var i = 0; i < wordInfo.children.length; i++) {
					var listItem = wordInfo.children[i];
					for (var j = listItem.children.length - 1; j >= 0; j--) {
						var child = listItem.children[j];
						if (child.tagName == "UL" || child.tagName == "DL") {
							listItem.removeChild(child);
						}
					}
					listItem.innerHTML = listItem.textContent; // Remove hyperlinks and formatting
				}
				
				
				$("<h2>"+(word.charAt(0).toUpperCase() + word.slice(1))+"</h2>").prependTo(popup);
			} else {
				popup.html('Definition for "' + word + '" not found');
			}
		});
}

function documentKeyDown(event) {
	pressedKeys[event.keyCode] = true;
	if(pressedKeys[16] && pressedKeys[17] && hoveredWord !== "") {
		if(shownWord !== hoveredWord) {
			popup.empty();
			popup.html("Please wait...");
			createDefinition(hoveredWord);
			shownWord = hoveredWord;
		}
		popup.stop(true, true).fadeTo(100, 1.0);
	}
}

function documentKeyUp(event) {
	pressedKeys[event.keyCode] = false;
	
	if(!pressedKeys[16] && !pressedKeys[17] /*&& isPopupShown*/) {
		popup.stop(true, true).fadeOut(100);
	}
}

$(document).mousemove(documentMouseMove).keydown(documentKeyDown).keyup(documentKeyUp);