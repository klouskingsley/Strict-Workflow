/*

  Constants

*/

var PREFS = loadPrefs();

function defaultPrefs() {
  return {
    siteList: [
      "facebook.com",
      "youtube.com",
      "twitter.com",
      "tumblr.com",
      "pinterest.com",
      "myspace.com",
      "livejournal.com",
      "digg.com",
      "stumbleupon.com",
      "reddit.com",
      "kongregate.com",
      "newgrounds.com",
      "addictinggames.com",
      "hulu.com",
    ],
    durations: {
      // in seconds
      work: 25 * 60,
      break: 5 * 60,
    },
    shouldRing: true,
    clickRestarts: false,
    whitelist: false,
  };
}

function loadPrefs() {
  if (typeof localStorage["prefs"] !== "undefined") {
    return updatePrefsFormat(JSON.parse(localStorage["prefs"]));
  } else {
    return savePrefs(defaultPrefs());
  }
}

function updatePrefsFormat(prefs) {
  // Sometimes we need to change the format of the PREFS module. When just,
  // say, adding boolean flags with false as the default, there's no
  // compatibility issue. However, in more complicated situations, we need
  // to modify an old PREFS module's structure for compatibility.

  if (prefs.hasOwnProperty("domainBlacklist")) {
    // Upon adding the whitelist feature, the domainBlacklist property was
    // renamed to siteList for clarity.

    prefs.siteList = prefs.domainBlacklist;
    delete prefs.domainBlacklist;
    savePrefs(prefs);
    console.log("Renamed PREFS.domainBlacklist to PREFS.siteList");
  }

  if (!prefs.hasOwnProperty("showNotifications")) {
    // Upon adding the option to disable notifications, added the
    // showNotifications property, which defaults to true.
    prefs.showNotifications = true;
    savePrefs(prefs);
    console.log("Added PREFS.showNotifications");
  }

  return prefs;
}

function savePrefs(prefs) {
  localStorage["prefs"] = JSON.stringify(prefs);
  return prefs;
}

function setPrefs(prefs) {
  PREFS = savePrefs(prefs);
  return prefs;
}

/*

  Views

*/

// The code gets really cluttered down here. Refactor would be in order,
// but I'm busier with other projects >_<

function locationsMatch(location, listedPattern) {
  return (
    domainsMatch(location.domain, listedPattern.domain) &&
    pathsMatch(location.path, listedPattern.path)
  );
}

function parseLocation(location) {
  var components = location.split("/");
  return { domain: components.shift(), path: components.join("/") };
}

function pathsMatch(test, against) {
  /*
    index.php ~> [null]: pass
    index.php ~> index: pass
    index.php ~> index.php: pass
    index.php ~> index.phpa: fail
    /path/to/location ~> /path/to: pass
    /path/to ~> /path/to: pass
    /path/to/ ~> /path/to/location: fail
  */

  return !against || test.substr(0, against.length) == against;
}

function domainsMatch(test, against) {
  /*
    google.com ~> google.com: case 1, pass
    www.google.com ~> google.com: case 3, pass
    google.com ~> www.google.com: case 2, fail
    google.com ~> yahoo.com: case 3, fail
    yahoo.com ~> google.com: case 2, fail
    bit.ly ~> goo.gl: case 2, fail
    mail.com ~> gmail.com: case 2, fail
    gmail.com ~> mail.com: case 3, fail
  */

  // Case 1: if the two strings match, pass
  if (test === against) {
    return true;
  } else {
    var testFrom = test.length - against.length - 1;

    // Case 2: if the second string is longer than first, or they are the same
    // length and do not match (as indicated by case 1 failing), fail
    if (testFrom < 0) {
      return false;
    } else {
      // Case 3: if and only if the first string is longer than the second and
      // the first string ends with a period followed by the second string,
      // pass
      return test.substr(testFrom) === "." + against;
    }
  }
}

function isLocationBlocked(location) {
  for (var k in PREFS.siteList) {
    listedPattern = parseLocation(PREFS.siteList[k]);
    if (locationsMatch(location, listedPattern)) {
      // If we're in a whitelist, a matched location is not blocked => false
      // If we're in a blacklist, a matched location is blocked => true
      return !PREFS.whitelist;
    }
  }

  // If we're in a whitelist, an unmatched location is blocked => true
  // If we're in a blacklist, an unmatched location is not blocked => false
  return PREFS.whitelist;
}

function executeInTabIfBlocked(action, tab) {
  var file = "content_scripts/" + action + ".js",
    location;
  location = tab.url.split("://");
  location = parseLocation(location[1]);

  if (isLocationBlocked(location)) {
    chrome.tabs.executeScript(tab.id, { file: file });
  }
}

function executeInAllBlockedTabs(action) {
  var windows = chrome.windows.getAll({ populate: true }, function (windows) {
    var tabs, tab, domain, listedDomain;
    for (var i in windows) {
      tabs = windows[i].tabs;
      for (var j in tabs) {
        executeInTabIfBlocked(action, tabs[j]);
      }
    }
  });
}

function shouldBlock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const time = h * 3600 + m * 60;

  const start = PREFS.durations.work;
  const end = PREFS.durations.break;

  console.log("background", start, end, time);

  if (start < end) {
    return time >= start && time <= end;
  } else {
    return time >= start || time <= end;
  }
}

chrome.browserAction.onClicked.addListener(function (tab) {
  executeInAllBlockedTabs(shouldBlock() ? "block" : "unblock");
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  executeInTabIfBlocked(shouldBlock() ? "block" : "unblock", tab);
});

chrome.notifications.onClicked.addListener(function (id) {
  // Clicking the notification brings you back to Chrome, in whatever window
  // you were last using.
  chrome.windows.getLastFocused(function (window) {
    chrome.windows.update(window.id, { focused: true });
  });
});
