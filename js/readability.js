var readabilityVersion = "0.4";
var emailSrc = 'http://davehauenstein.com/readability/email.php';
var iframeLoads = 0;

function readability() {
	var str_data = data_retrieve('http://fullcomment.nationalpost.com/2011/12/24/robert-fulford-on-the-secret-to-happiness-sip-it-in-small-doses/?utm_source=dlvr.it&utm_medium=twitter');
	var element = document.implementation.createHTMLDocument('Readability');
    element.open();
    element.write(str_data);
    element.close();	
	start_parser(element);
}

function start_parser( element ) {
	var objOverlay = element.createElement("div");
	var objinnerDiv = element.createElement("div");
	var articleTools = element.createElement("DIV");
	
	objOverlay.id = "readOverlay";
	objinnerDiv.id = "readInner";
	
	// Apply user-selected styling:
	//element.body.className = readStyle;
	//objOverlay.className = readStyle;
	//objinnerDiv.className = readMargin + " " + readSize;
	
	// Set up tools widget 
	
	// NOTE THE IMAGE URL'S HERE !!!!!!!!!!!!!!!!!
	// NOTE THE IMAGE URL'S HERE !!!!!!!!!!!!!!!!!
	// NOTE THE IMAGE URL'S HERE !!!!!!!!!!!!!!!!!
	articleTools.id = "readTools";
	articleTools.innerHTML = "\
		<a href='#' onclick='return window.location.reload()' title='Reload original page' id='reload-page'>Reload Original Page</a>\
		<a href='#' onclick='javascript:window.print();' title='Print page' id='print-page'>Print Page</a>\
		<a href='#' onclick='emailBox(); return false;' title='Email page' id='email-page'>Email Page</a>\
	";

	objinnerDiv.appendChild(grabArticle(element));		// Get the article and place it inside the inner Div
	objOverlay.appendChild(articleTools);
	objOverlay.appendChild(objinnerDiv);		// Insert the inner div into the overlay

	// For totally hosed HTML, add body node that can't be found because of bad HTML or something.
	if(element.body == null)
	{
		body = element.createElement("body");
		element.body = body;
	}

	element.body.innerHTML = "";
	
	// Inserts the new content :
	element.body.insertBefore(objOverlay, element.body.firstChild);
}

function grabArticle( element ) {
	var allParagraphs = element.getElementsByTagName("p");
	var topDivCount = 0;
	var topDiv = null;
	var topDivParas;
	
	var articleContent = element.createElement("DIV");
	var articleTitle = element.createElement("H1");
	var articleFooter = element.createElement("DIV");
	
	// Replace all doubled-up <BR> tags with <P> tags, and remove fonts.
	var pattern =  new RegExp ("<br/?>[ \r\n\s]*<br/?>", "g");
	element.body.innerHTML = element.body.innerHTML.replace(pattern, "</p><p>").replace(/<\/?font[^>]*>/g, '');
	
	// Grab the title from the <title> tag and inject it as the title.
	articleTitle.innerHTML = element.title;
	articleContent.appendChild(articleTitle);
	
	// Study all the paragraphs and find the chunk that has the best score.
	// A score is determined by things like: Number of <p>'s, commas, special classes, etc.
	for (var j=0; j	< allParagraphs.length; j++) {
		parentNode = allParagraphs[j].parentNode;

		// Initialize readability data
		if(typeof parentNode.readability == 'undefined')
		{
			parentNode.readability = {"contentScore": 0};			

			// Look for a special classname
			if(parentNode.className.match(/(comment|meta|footer|footnote)/))
				parentNode.readability.contentScore -= 50;
			else if(parentNode.className.match(/((^|\\s)(post|hentry|entry[-]?(content|text|body)?|article[-]?(content|text|body)?)(\\s|$))/))
				parentNode.readability.contentScore += 25;

			// Look for a special ID
			if(parentNode.id.match(/(comment|meta|footer|footnote)/))
				parentNode.readability.contentScore -= 50;
			else if(parentNode.id.match(/^(post|hentry|entry[-]?(content|text|body)?|article[-]?(content|text|body)?)$/))
				parentNode.readability.contentScore += 25;
		}

		// Add a point for the paragraph found
		if(getInnerText(allParagraphs[j]).length > 10)
			parentNode.readability.contentScore++;

		// Add points for any commas within this paragraph
		parentNode.readability.contentScore += getCharCount(allParagraphs[j]);
	}

	// Assignment from index for performance. See http://www.peachpit.com/articles/article.aspx?p=31567&seqNum=5 
	for(nodeIndex = 0; (node = element.getElementsByTagName('*')[nodeIndex]); nodeIndex++)
		if(typeof node.readability != 'undefined' && (topDiv == null || node.readability.contentScore > topDiv.readability.contentScore))
			topDiv = node;

	if(topDiv == null)
	{
	  topDiv = element.createElement('div');
	  topDiv.innerHTML = 'Sorry, readability was unable to parse this page for content. If you feel like it should have been able to, please <a href="http://code.google.com/p/arc90labs-readability/issues/entry">let us know by submitting an issue.</a>';
	}
	
	// REMOVES ALL STYLESHEETS ...
	for (var k=0;k < element.styleSheets.length; k++) {
		if (element.styleSheets[k].href != null && element.styleSheets[k].href.lastIndexOf("readability") == -1) {
			element.styleSheets[k].disabled = true;
		}
	}

	// Remove all style tags in head (not doing this on IE) :
	var styleTags = element.getElementsByTagName("style");
	for (var j=0;j < styleTags.length; j++)
		if (navigator.appName != "Microsoft Internet Explorer")
			styleTags[j].textContent = "";

	cleanStyles(topDiv);					// Removes all style attributes
	topDiv = killDivs(topDiv);				// Goes in and removes DIV's that have more non <p> stuff than <p> stuff
	topDiv = killBreaks(topDiv);            // Removes any consecutive <br />'s into just one <br /> 

	// Cleans out junk from the topDiv just in case:
	topDiv = clean(topDiv, "form");
	topDiv = clean(topDiv, "object");
	topDiv = clean(topDiv, "table", 250);
	topDiv = clean(topDiv, "h1");
	topDiv = clean(topDiv, "h2");
	topDiv = clean(topDiv, "iframe");
	

	// Add the footer and contents:
	articleFooter.id = "readFooter";
	articleFooter.innerHTML = "\
		<a href='http://www.arc90.com'><img src='http://lab.arc90.com/experiments/readability/images/footer.png'></a>\
                <div class='footer-right' >\
                        <span class='version'>Readability version " + readabilityVersion + "</span>\
		</div>\
	";

	articleContent.appendChild(topDiv);
	articleContent.appendChild(articleFooter);
	
	return articleContent;
}

// Get the inner text of a node - cross browser compatibly.
function getInnerText(e) {
	if (navigator.appName == "Microsoft Internet Explorer")
		return e.innerText;
	else
		return e.textContent;
}

// Get character count
function getCharCount ( e,s ) {
    s = s || ",";
	return getInnerText(e).split(s).length;
}

function cleanStyles( e ) {
    e = e || document;
    var cur = e.firstChild;

	// If we had a bad node, there's not much we can do.
	if(!e)
		return;

	// Remove any root styles, if we're able.
	if(typeof e.removeAttribute == 'function')
		e.removeAttribute('style');

    // Go until there are no more child nodes
    while ( cur != null ) {
		if ( cur.nodeType == 1 ) {
			// Remove style attribute(s) :
			cur.removeAttribute("style");
			cleanStyles( cur );
		}
		cur = cur.nextSibling;
	}
}

function killDivs ( e ) {
	var divsList = e.getElementsByTagName( "div" );
	var curDivLength = divsList.length;
	
	// Gather counts for other typical elements embedded within.
	// Traverse backwards so we can remove nodes at the same time without effecting the traversal.
	for (var i=curDivLength-1; i >= 0; i--) {
		var p = divsList[i].getElementsByTagName("p").length;
		var img = divsList[i].getElementsByTagName("img").length;
		var li = divsList[i].getElementsByTagName("li").length;
		var a = divsList[i].getElementsByTagName("a").length;
		var embed = divsList[i].getElementsByTagName("embed").length;

	// If the number of commas is less than 10 (bad sign) ...
	if ( getCharCount(divsList[i]) < 10) {
			// And the number of non-paragraph elements is more than paragraphs 
			// or other ominous signs :
			if ( img > p || li > p || a > p || p == 0 || embed > 0) {
				divsList[i].parentNode.removeChild(divsList[i]);
			}
		}
	}
	return e;
}

function killBreaks ( e ) {
	e.innerHTML = e.innerHTML.replace(/(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,'<br />');
	return e;
}

function clean(e, tags, minWords) {
	var targetList = e.getElementsByTagName( tags );
	minWords = minWords || 1000000;

	for (var y=0; y < targetList.length; y++) {
		// If the text content isn't laden with words, remove the child:
		if (getCharCount(targetList[y], " ") < minWords) {
			targetList[y].parentNode.removeChild(targetList[y]);
		}
	}
	return e;
}

function emailBox() {
    var emailContainer = element.getElementById('email-container');
    if(null != emailContainer)
    {
        return;
    }

    var emailContainer = element.createElement('div');
    emailContainer.setAttribute('id', 'email-container');
    emailContainer.innerHTML = '<iframe src="'+emailSrc + '?pageUrl='+escape(window.location)+'&pageTitle='+escape(element.title)+'" scrolling="no" onload="removeFrame()" style="width:500px; height: 490px; border: 0;"></iframe>';

    element.body.appendChild(emailContainer);
}

function removeFrame()
{
    ++iframeLoads;
    if(iframeLoads >= 6)
    {
        var emailContainer = element.getElementById('email-container');
        if(null != emailContainer) {
            emailContainer.parentNode.removeChild(emailContainer);
        }
        // reset the count
        iframeLoads = 0;
    }
}

//readability();