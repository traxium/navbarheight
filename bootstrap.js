/*
 * This file is part of Nav Bar Resizer,
 * Copyright (C) 2015 Sergey Zelentsov <crayfishexterminator@gmail.com>
 */

"use strict";
/* global Components, Services, APP_SHUTDOWN */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);

var sizes = [25, 27, 29, 31, 33, 35, 37, 39];
var URIs = sizes.map((x) => Services.io.newURI("chrome://navbarresizer/skin/tt-navbar-" + x + ".css", null, null));
var prefObserver = {
	observe: function(subject, topic, data) {
		if (topic == "nsPref:changed") {
			// unload all:
			URIs.forEach((x) => {
				if (sss.sheetRegistered(x, sss.AUTHOR_SHEET)) {
					sss.unregisterSheet(x, sss.AUTHOR_SHEET);
				}
			});
			let pref = Services.prefs.getIntPref("extensions.navbarresizer.size");
			let idx = sizes.indexOf(pref);
			if (idx !== -1) {
				sss.loadAndRegisterSheet(URIs[idx], sss.AUTHOR_SHEET);
			}
		}
	}
};

function startup(data, reason)
{
	// default #nav-bar:
	
	// 41px total:
	// 0px border
	// 8px
	// 1px border
	// 22px URL bar
	// 1px border
	// 8px
	// 1px border
	
	// Or:
	
	// 41px total:
	// 0px border
	// 12px
	// 16px icon
	// 12px
	// 1px border

	// #nav-bar size from 25px to 39px:
	Services.prefs.getDefaultBranch(null).setIntPref("extensions.navbarresizer.size", 27);
	
	prefObserver.observe(null, "nsPref:changed", "extensions.navbarresizer.size");
	Services.prefs.addObserver("extensions.navbarresizer.size", prefObserver, false);
}

function shutdown(aData, aReason)
{
	if (aReason == APP_SHUTDOWN) return;

	Services.prefs.removeObserver("extensions.navbarresizer.size", prefObserver);
	URIs.forEach((x) => {
		if (sss.sheetRegistered(x, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(x, sss.AUTHOR_SHEET);
		}
	});
}

function install(aData, aReason) { }
function uninstall(aData, aReason) { }