// ======================================================================
// FEEDBACK FORM
// The Feedback screen: players choose a name or Anonymous, write a title and a message,
// and press Submit. It is sent to the feedback website (FEEDBACK_URL in config.js).
// Like every menu it is drawn into the #ov overlay.
// ======================================================================

// Same limits as the feedback website (feedback-site/server.js).
const FB_LIMITS = { name: 30, title: 80, titleMin: 3, text: 1500, textMin: 10 };

// What the player has typed so far. Kept here so nothing is lost if they go Back and return.
const fbDraft = { useName: false, name: '', title: '', text: '' };

// Sends the feedback to the website. Resolves when it was saved, otherwise throws an Error with a message for the player.
async function sendFeedback() {
  if (!FEEDBACK_URL)
    throw new Error('Feedback is not available right now.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(FEEDBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymous: !fbDraft.useName,
        name: fbDraft.useName ? fbDraft.name.trim() : '',
        title: fbDraft.title.trim(),
        content: fbDraft.text.trim()
      }),
      signal: controller.signal
    });
  }
  catch (e) {
    throw new Error("Couldn't reach the feedback server. Check your connection and try again.");
  }
  finally {
    clearTimeout(timer);
  }
  if (res.ok)
    return;
  let reason = '';
  try {
    reason = (await res.json()).error || '';
  }
  catch (e) {
  }
  throw new Error(reason || 'Something went wrong. Please try again later.');
}

// Draws the Feedback screen. `from` is "menu" or "pause" and decides where Back returns to.
function feedbackScreen(from) {
  const o = $('ov');
  o.style.display = 'flex';
  o.innerHTML = '<h1>Feedback</h1>' +
    '<div class="fbwrap">' +
    '<p class="fbhint">Tell us what you think about the game!</p>' +
    '<div class="fbchoices">' +
    '<label class="fbchk"><input type="checkbox" id="fbAnon"><span>Anonymous</span></label>' +
    '<label class="fbchk"><input type="checkbox" id="fbUseName"><span>Use my name</span></label>' +
    '</div>' +
    '<input class="fbin" id="fbName" type="text" maxlength="' + FB_LIMITS.name + '" placeholder="Your name" autocomplete="nickname">' +
    '<input class="fbin" id="fbTitle" type="text" maxlength="' + FB_LIMITS.title + '" placeholder="Title / topic">' +
    '<textarea class="fbin" id="fbText" rows="6" maxlength="' + FB_LIMITS.text + '" placeholder="Write your feedback here..."></textarea>' +
    '<div class="fbcount" id="fbCount"></div>' +
    '<p class="fbmsg" id="fbMsg" role="alert"></p>' +
    '</div>' +
    '<button class="opt fbbtn" id="fbSend"><b>Submit</b></button>' +
    '<button class="opt fbbtn" id="fbBack" style="border-color:#fff8"><b style="color:#fff">Back</b></button>';

  const anon = $('fbAnon');
  const useName = $('fbUseName');
  const name = $('fbName');
  const title = $('fbTitle');
  const text = $('fbText');
  const msg = $('fbMsg');
  const send = $('fbSend');
  let sending = false;

  // Exactly one of the two checkboxes is always ticked: "Anonymous" or "Use my name".
  function setMode(nameMode) {
    fbDraft.useName = nameMode;
    anon.checked = !nameMode;
    useName.checked = nameMode;
    name.style.display = nameMode ? 'block' : 'none';
  }
  function showCount() {
    $('fbCount').textContent = text.value.length + ' / ' + FB_LIMITS.text;
  }
  function say(message, ok) {
    msg.textContent = message;
    msg.className = 'fbmsg' + (ok ? ' ok' : '');
  }

  // restore what was typed before
  name.value = fbDraft.name;
  title.value = fbDraft.title;
  text.value = fbDraft.text;
  setMode(fbDraft.useName);
  showCount();

  anon.onchange = () => setMode(!anon.checked);
  useName.onchange = () => setMode(useName.checked);
  name.oninput = () => fbDraft.name = name.value;
  title.oninput = () => fbDraft.title = title.value;
  text.oninput = () => {
    fbDraft.text = text.value;
    showCount();
  };

  $('fbBack').onclick = () => {
    if (from === 'pause') {
      S.state = 'play';
      pause();
    }
    else
      menu();
  };

  send.onclick = async () => {
    if (sending)
      return;
    // check the form before sending
    if (fbDraft.useName && !fbDraft.name.trim()) {
      say('Please type your name, or choose Anonymous.');
      return name.focus();
    }
    if (fbDraft.title.trim().length < FB_LIMITS.titleMin) {
      say('Please add a title (at least ' + FB_LIMITS.titleMin + ' characters).');
      return title.focus();
    }
    if (fbDraft.text.trim().length < FB_LIMITS.textMin) {
      say('Please write a little more (at least ' + FB_LIMITS.textMin + ' characters).');
      return text.focus();
    }
    sending = true;
    send.disabled = true;
    send.firstChild.textContent = 'Sending...';
    say('');
    try {
      await sendFeedback();
      // success: clear the form and thank the player
      fbDraft.title = '';
      fbDraft.text = '';
      $('ov').querySelector('.fbwrap').innerHTML = '<p class="fbthanks">Thank you!</p><p class="fbhint">Your feedback was sent. Thanks for helping make the game better.</p>';
      send.style.display = 'none';
    }
    catch (e) {
      say(e.message);
      sending = false;
      send.disabled = false;
      send.firstChild.textContent = 'Submit';
    }
  };
}
