// Get the full word the cursor is over regardless of span breaks
function getFullWord(event) {
	var i, begin, end, range, textNode, offset;

	// Chrome
	if (document.caretRangeFromPoint) {
		range = document.caretRangeFromPoint(event.clientX, event.clientY);
		textNode = range.startContainer;
		offset = range.startOffset;
	}

	// Only act on text nodes
	if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
		return "";
	}

	var data = textNode.textContent;

	// Sometimes the offset can be at the 'length' of the data.
	// It might be a bug with this 'experimental' feature
	// Compensate for this below
	if (offset >= data.length) {
		offset = data.length - 1;
	}

	// Ignore the cursor on spaces - these aren't words
	if (isW(data[offset])) {
		return "";
	}

	// Scan behind the current character until whitespace is found, or beginning
	i = begin = end = offset;
	while (i > 0 && !isW(data[i - 1])) {
		i--;
	}
	begin = i;

	// Scan ahead of the current character until whitespace is found, or end
	i = offset;
	while (i < data.length - 1 && !isW(data[i + 1])) {
		i++;
	}
	end = i;

	// This is our temporary word
	var word = data.substring(begin, end + 1);

	// If at a node boundary, cross over and see what 
	// the next word is and check if this should be added to our temp word
	if (end === data.length - 1 || begin === 0) {

		var nextNode = getNextNode(textNode);
		var prevNode = getPrevNode(textNode);

		// Get the next node text
		if (end == data.length - 1 && nextNode) {
			var nextText = nextNode.textContent;

			// Add the letters from the next text block until a whitespace, or end
			i = 0;
			while (i < nextText.length && !isW(nextText[i])) {
				word += nextText[i++];
			}

		} else if (begin === 0 && prevNode) {
			// Get the previous node text
			var prevText = prevNode.textContent;

			// Add the letters from the next text block until a whitespace, or end
			i = prevText.length - 1;
			while (i >= 0 && !isW(prevText[i])) {
				word = prevText[i--] + word;
			}
		}
	}
	return word;
}

// Helper functions
// Whitespace checker
function isW(s) {
	return /[\u0000-\u0026\u0028-\u0040\u005B-\u0060\u007B-\u00BF]/.test(s);
}

// Barrier nodes are BR, DIV, P, PRE, TD, TR, ... 
function isBarrierNode(node) {
	return node ? /^(BR|DIV|P|PRE|TD|TR|TABLE)$/i.test(node.nodeName) : true;
}

// Try to find the next adjacent node
function getNextNode(node) {
	var n = null;
	// Does this node have a sibling?
	if (node.nextSibling) {
		n = node.nextSibling;

		// Does this node's container have a sibling?
	} else if (node.parentNode && node.parentNode.nextSibling) {
		n = node.parentNode.nextSibling;
	}
	return isBarrierNode(n) ? null : n;
}

// Try to find the prev adjacent node
function getPrevNode(node) {
	var n = null;

	// Does this node have a sibling?
	if (node.previousSibling) {
		n = node.previousSibling;

		// Doe this node's container have a sibling?
	} else if (node.parentNode && node.parentNode.previousSibling) {
		n = node.parentNode.previousSibling;
	}
	return isBarrierNode(n) ? null : n;
}