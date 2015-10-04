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
// Randomize URI to work around bug 719376:
var stringBundle = Services.strings.createBundle('chrome://navbarresizer/locale/global.properties?' + Math.random());

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

	// Add the context menu option into any existing windows:
	let XULWindows = Services.wm.getXULWindowEnumerator(null);
	while (XULWindows.hasMoreElements()) {
		let aXULWindow = XULWindows.getNext();
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
		windowListener.addOption(aDOMWindow);
	}
	// Listen to new windows:
	Services.wm.addListener(windowListener);
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

	//Stop listening:
	Services.wm.removeListener(windowListener);
	// Remove the context menu option from any existing windows:
	let XULWindows = Services.wm.getXULWindowEnumerator(null);
	while (XULWindows.hasMoreElements()) {
		let aXULWindow = XULWindows.getNext();
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
		windowListener.removeOption(aDOMWindow);
	}
}

function install(aData, aReason) { }
function uninstall(aData, aReason) { }

var windowListener = {
	
	addOption: function (aDOMWindow) {
		let toolbarContextMenu = aDOMWindow.document.querySelector("#toolbar-context-menu");
		// #toolbar-context-menu is empty when a window is just opened because its menu items removed and added on "popupshowing"
		if (toolbarContextMenu) {
			let sizeMenu = aDOMWindow.document.createElement("menu");
			sizeMenu.id = "nbr-size-menu";
			sizeMenu.setAttribute("label", stringBundle.GetStringFromName("nav_bar_height"));
			toolbarContextMenu.insertBefore(sizeMenu, toolbarContextMenu.lastElementChild); // Before "Customize..."

			let sizePopup = aDOMWindow.document.createElement("menupopup");
			sizePopup.id = "nbr-size-popup";
			sizeMenu.appendChild(sizePopup);

			sizes.forEach((x) => {
				let item = aDOMWindow.document.createElement("menuitem");
				item.setAttribute("type", "checkbox");
				item.setAttribute("label", stringBundle.GetStringFromName(x.toString()));
				sizePopup.appendChild(item);
			});
			
			let menuSeparator = aDOMWindow.document.createElement("menuseparator");
			sizePopup.appendChild(menuSeparator);
			
			let itemDefault = aDOMWindow.document.createElement("menuitem");
			itemDefault.setAttribute("type", "checkbox");
			itemDefault.setAttribute("label", stringBundle.GetStringFromName("-1"));
			sizePopup.appendChild(itemDefault);

			sizePopup.addEventListener("popupshowing", (event) => {
				// "for...of loops will loop over NodeList objects correctly, in browsers that support for...of (like Firefox 13 and later):"
				for (let item of event.currentTarget.children) {
					if (item.localName === "menuitem") {
						item.setAttribute("checked", "false");
					}
				}
				let pref = Services.prefs.getIntPref("extensions.navbarresizer.size");
				let idx = sizes.indexOf(pref);
				if (idx === -1) {
					event.currentTarget.lastElementChild.setAttribute("checked", "true");
				} else {
					event.currentTarget.children[idx].setAttribute("checked", "true");
				}
			});

			sizePopup.addEventListener('command', (event) => {
				if (event.currentTarget.lastElementChild === event.target) {
					// Default Nav Bar Height:
					Services.prefs.setIntPref("extensions.navbarresizer.size", -1);
				} else {
					let idx = Array.prototype.indexOf.call(event.currentTarget.children, event.target);
					Services.prefs.setIntPref("extensions.navbarresizer.size", sizes[idx]);
				}
			}, false);
		}
	},

	removeOption: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		let sizeMenu = aDOMWindow.document.querySelector("#nbr-size");
		if (sizeMenu) {
			sizeMenu.parentNode.removeChild(sizeMenu);
		}
	},

	onOpenWindow: function (aXULWindow) {
		// In Gecko 7.0 nsIDOMWindow2 has been merged into nsIDOMWindow interface.
		// In Gecko 8.0 nsIDOMStorageWindow and nsIDOMWindowInternal have been merged into nsIDOMWindow interface.
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function onLoad(event) {
			aDOMWindow.removeEventListener("load", onLoad, false);

			windowListener.addOption(aDOMWindow);
		}, false);
	}

};