document.onload = init();

function init() {
	var i = 0,
		k = 0,
		textarea = document.getElementById("text"),
		preview = document.querySelector("#preview"),
		post = document.querySelector("#preview .post")
		converter = new Markdown.Converter(),
		isPreviewActive = false,
		words = [],
		settings = {
			soundBtn: document.getElementById("muteBtn"),
			fullBtn: document.getElementById("fsBtn"),
			thmBtn: document.getElementById("thmBtn"),
			sound: "yes",
			full: "no",
			theme: "dark"
		};

	/*
	// Audio Init (Multi channel) -- Doesn't work anymore
	var source_key = 'sfx/1.' + ((new Audio).canPlayType('audio/wav') ? 'wav' : 'mp3')
		,	source_ent = 'sfx/enter.' + ((new Audio).canPlayType('audio/wav') ? 'wav' : 'mp3');

	var audio_key = new Audio(source_key)
		,	audio_ent = new Audio(source_ent);
	
	document.body.appendChild(audio_key);
	document.body.appendChild(audio_ent);

	var chan_key = [audio_key, audio_key, audio_key, audio_key, audio_key, audio_key]
		, chan_ent = [audio_ent, audio_ent, audio_ent, audio_ent, audio_ent, audio_ent];

	audio_key.load();
	audio_ent.load();
	*/

	var audio_key = new buzz.sound( "/sfx/1", {
    formats: [ "mp3", "wav" ],
    channels: 6
	});

	var audio_ent = new buzz.sound( "/sfx/enter", {
    formats: [ "mp3", "wav" ],
    channels: 6
	});

	textarea.focus();
	
	try {
		if(localStorage.getItem("sound") == "no") {
			settings.sound = "no";
			document.getElementById("muteVal").innerHTML = "no";	
		}

		if(localStorage.getItem("theme") == "light") {
			settings.theme = "light";
			document.getElementById("thmVal").innerHTML = "light";	

			$("body").removeClass("dark");
			$("body").addClass("light");
		}
	} catch(e) {}

	// Get the previous text, if any
	savedText = "";
	try {
		if (!window.key)
			savedText = localStorage.getItem("text");
	} catch(e) {}

	if(savedText) {
		textarea.value = savedText;

		savedText = savedText.replace(/(^\s*)|(\s*$)/gi,"");
		savedText = savedText.replace(/[ ]{2,}/gi," ");
		savedText = savedText.replace(/\n /,"\n");
		document.getElementById("wordCount").innerHTML = savedText.split(' ').length + " words";
	}

	// Play the sound
	textarea.addEventListener("keydown", function(e) {
		if(settings.sound == "yes") {
			keyCode = e.keyCode || e.which;

			if(keyCode == 13) {
				audio_ent.volume = 0.2 + (Math.random() * 0.5);
				audio_ent.play();
			} else {
				audio_key.volume = 0.2 + (Math.random() * 0.5);
				audio_key.play();
			}
		}

		//console.log(e.keyCode);
	}, false);

	// Insert tab when "tab" is pressed
	// Thanks to http://stackoverflow.com/questions/6637341/use-tab-to-indent-in-textarea
	textarea.addEventListener("keydown", function(e) {
		keyCode = e.keyCode || e.which;

		if(keyCode == 9) {
			e.preventDefault();

			var start = textarea.selectionStart,
				end = textarea.selectionEnd;

			// set textarea value to: text before caret + tab + text after caret
			textarea.value = textarea.value.substring(0, start)
				+ "\t"
                + textarea.value.substring(end);

            // put caret at right position again
		    textarea.selectionStart = textarea.selectionEnd = start + 1;
		}

		value = textarea.value;
		value = value.replace(/(^\s*)|(\s*$)/gi,"");
		value = value.replace(/[ ]{2,}/gi," ");
		value = value.replace(/\n /,"\n");
		document.getElementById("wordCount").innerHTML = value.split(' ').length + " words";

  	}, false);

	// Saving after every 2 seconds
	try {
		if(localStorage.getItem("firstTime") == "false")
			setInterval(function() {
					localStorage.setItem("text", textarea.value);
			}, 2000);
	} catch(e) {}

	// Settings
	settings.soundBtn.addEventListener("click", function(e) {
		if(settings.sound == "yes") {
			settings.sound = "no"
			document.getElementById("muteVal").innerHTML = "no";
			localStorage.setItem("sound", "no");
		}

		else {
			settings.sound = "yes"
			document.getElementById("muteVal").innerHTML = "yes";
			localStorage.setItem("sound", "yes");
		}

		e.preventDefault();
	}, false);

	settings.fullBtn.addEventListener("click", function(e) {
		if(settings.full == "yes") {
			settings.full = "no"
			document.getElementById("fsVal").innerHTML = "no";

			cancelFullScreen(document.body);
		}

		else {
			settings.full = "yes"
			document.getElementById("fsVal").innerHTML = "yes";

			requestFullScreen(document.body);
			document.body.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);		
		}
		
		e.preventDefault();
	}, false);

	settings.thmBtn.addEventListener("click", function(e) {
		if(settings.theme == "dark") {
			settings.theme = "light"
			document.getElementById("thmVal").innerHTML = "light";

			$("body").removeClass("dark");
			$("body").addClass("light");

			localStorage.setItem("theme", "light");
		}

		else {
			settings.theme = "dark"
			document.getElementById("thmVal").innerHTML = "dark";

			$("body").removeClass("light");
			$("body").addClass("dark");
			
			localStorage.setItem("theme", "dark");
		}
		
		e.preventDefault();
	}, false);

	function requestFullScreen(element) {
    // Supports most browsers and their versions.
    var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;

    if (requestMethod) { // Native full screen.
      requestMethod.call(element);
    } 
	}

	function cancelFullScreen(element) {
    // Supports most browsers and their versions.
    var requestMethod = element.exitFullscreen || element.webkitCancelFullScreen || element.mozCancelFullScreen;

    if (requestMethod) { // Native full screen.
      requestMethod.call(element);
    } 
	}

	// Key bindings
	document.addEventListener("keydown", function(e) {
		keyCode = e.keyCode || e.which;

		if((e.ctrlKey || e.metaKey) && keyCode == 77) {
			if(!isPreviewActive) {
				post.innerHTML  = converter.makeHtml(textarea.value);
				preview.style.opacity = 1;
				preview.style.visibility = "visible";

				isPreviewActive = true;
				textarea.blur();
			}
			else {
				preview.style.opacity = 0;
				preview.style.visibility = "hidden";

				isPreviewActive = false;
				textarea.focus();
			}
			e.preventDefault();
		}

		if((e.ctrlKey || e.metaKey) && keyCode == 83) {
			var content = $('#text').val()
				, url = '/write/save';

			if (window.key) {
				// Update
				key = window.key;
				url = '/write/update';
				// console.log(window.key);
			}

			notify('Saving...', 'working');

			$.post(
				url,
				{content: content, "key": key},
				function(data) {
					if (data.key) {
						location.href = '/edit/'+data.key;
					}
					notify('Updated successfully.', 'success');
					remove_notify();
				},
				'json'
			).fail(function() {
				notify('An error occured while updating.', 'failure');
				remove_notify();
			});
			e.preventDefault();

		}


	}, false);

}

function notify(text, status) {
	var ele = $(".notify");

	ele.text(text);
	ele.removeClass();
	ele.addClass('notify ' + status);

	ele.stop(true, true).fadeIn(400);
}

function remove_notify() {
	var ele = $(".notify");
	ele.delay(2000).fadeOut(500);
}
