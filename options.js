/*
  Localization
*/

// Localize all elements with a data-i18n="message_name" attribute
var localizedElements = document.querySelectorAll("[data-i18n]"),
  el,
  message;
for (var i = 0; i < localizedElements.length; i++) {
  el = localizedElements[i];
  message = chrome.i18n.getMessage(el.getAttribute("data-i18n"));

  // Capitalize first letter if element has attribute data-i18n-caps
  if (el.hasAttribute("data-i18n-caps")) {
    message = message.charAt(0).toUpperCase() + message.substr(1);
  }

  el.innerHTML = message;
}

/*
  Form interaction
*/

var form = document.getElementById("options-form"),
  siteListEl = document.getElementById("site-list"),
  whitelistEl = document.getElementById("blacklist-or-whitelist"),
  showNotificationsEl = document.getElementById("show-notifications"),
  shouldRingEl = document.getElementById("should-ring"),
  clickRestartsEl = document.getElementById("click-restarts"),
  saveSuccessfulEl = document.getElementById("save-successful"),
  timeFormatErrorEl = document.getElementById("time-format-error"),
  background = chrome.extension.getBackgroundPage(),
  startCallbacks = {},
  durationEls = {};

durationEls["work"] = document.getElementById("work-duration");
durationEls["break"] = document.getElementById("break-duration");

var TIME_REGEX = /^([0-9]+)(:([0-9]{2}))?$/;

function decodeTime(value) {
  var arr = value.split(":");
  return +arr[0] * 3600 + +arr[1] * 60;
}

function encodeTime(num) {
  if (isNaN(num)) {
    return "00:00";
  }
  var h = Math.floor(num / 3600);
  var m = Math.floor((num - 3600 * h) / 60);
  return `${h}`.padStart(2, "0") + ":" + `${m}`.padStart(2, "0");
}

form.onsubmit = function () {
  console.log("form submitted");

  var durations = {
    work: decodeTime(durationEls.work.value),
    break: decodeTime(durationEls.break.value),
  };

  console.log(durations);

  background.setPrefs({
    siteList: siteListEl.value.split(/\r?\n/),
    durations: durations,
    showNotifications: showNotificationsEl.checked,
    shouldRing: shouldRingEl.checked,
    clickRestarts: clickRestartsEl.checked,
    whitelist: whitelistEl.selectedIndex == 1,
  });
  saveSuccessfulEl.className = "show";
  return false;
};

siteListEl.onfocus = formAltered;
showNotificationsEl.onchange = formAltered;
shouldRingEl.onchange = formAltered;
clickRestartsEl.onchange = formAltered;
whitelistEl.onchange = formAltered;

function formAltered() {
  saveSuccessfulEl.removeAttribute("class");
  timeFormatErrorEl.removeAttribute("class");
}

siteListEl.value = background.PREFS.siteList.join("\n");
showNotificationsEl.checked = background.PREFS.showNotifications;
shouldRingEl.checked = background.PREFS.shouldRing;
clickRestartsEl.checked = background.PREFS.clickRestarts;
whitelistEl.selectedIndex = background.PREFS.whitelist ? 1 : 0;
durationEls.work.value = encodeTime(background.PREFS.durations.work);
durationEls.break.value = encodeTime(background.PREFS.durations.break);

function setInputDisabled(state) {
  siteListEl.disabled = state;
  whitelistEl.disabled = state;
  for (var key in durationEls) {
    durationEls[key].disabled = state;
  }
}

startCallbacks.work = function () {
  document.body.className = "work";
  setInputDisabled(true);
};

startCallbacks.break = function () {
  document.body.removeAttribute("class");
  setInputDisabled(false);
};
