/*
 * This file is part of Nav Bar Height,
 * Copyright (C) 2015 Sergey Zelentsov <crayfishexterminator@gmail.com>
 */

"use strict";
/* global Components, Services, AddonManager, APP_SHUTDOWN */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);

var sizes = [24, 26, 28, 30, 32, 34, 36, 38];
var URIs = sizes.map((x) => Services.io.newURI("chrome://navbarheight/skin/tt-navbar-" + x + ".css", null, null));
var URIff41fix = Services.io.newURI("chrome://navbarheight/skin/tt-navbar-fix-ff41.css", null, null);
var URIff43fix = Services.io.newURI("chrome://navbarheight/skin/tt-navbar-fix-ff43.css", null, null);

// Randomize URI to work around bug 719376:
var stringBundle = Services.strings.createBundle('chrome://navbarheight/locale/global.properties?' + Math.random());

// default #nav-bar:

// 40px total:
// 8px
// 1px border
// 22px URL bar
// 1px border
// 8px

// Or:

// 40px total:
// 12px
// 16px icon
// 12px

function startup(data, reason)
{
	// #nav-bar size from 24px to 38px:
	Services.prefs.getDefaultBranch(null).setIntPref("extensions.navbarheight.size", 28);

	// Tab Tree takes priority over this add-on if Tab Tree is installed and enabled
	AddonManager.getAddonByID("TabsTree@traxium", (aAddon) => {
		// If an error occurred (such as an add-on not being found), null is passed back instead.
		if (aAddon && aAddon.isActive) {
			// If "Tab Tree" is installed and enabled
			// Do nothing
		} else {
			// If "Tab Tree" is not installed or disabled:
			windowListener.startup();
		}

		AddonManager.addAddonListener(addonListener);
	});
}

function shutdown(aData, aReason)
{
	if (aReason === APP_SHUTDOWN) {
		return;
	}

	AddonManager.removeAddonListener(addonListener);
	
	windowListener.shutdown();
}

function install(aData, aReason) { }
function uninstall(aData, aReason) { }

var windowListener = {
	
	addOption: function (aDOMWindow) {
		let toolbarContextMenu = aDOMWindow.document.querySelector("#toolbar-context-menu");
		// #toolbar-context-menu is empty when a window is just opened because its menu items removed and added on "popupshowing"
		if (toolbarContextMenu) {
			let sizeMenu = aDOMWindow.document.createElement("menu");
			sizeMenu.id = "nbh-size-menu";
			sizeMenu.setAttribute("label", stringBundle.GetStringFromName("nav_bar_height"));
			toolbarContextMenu.insertBefore(sizeMenu, toolbarContextMenu.lastElementChild); // Before "Customize..."

			let sizePopup = aDOMWindow.document.createElement("menupopup");
			sizePopup.id = "nbh-size-popup";
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
				let pref = Services.prefs.getIntPref("extensions.navbarheight.size");
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
					Services.prefs.setIntPref("extensions.navbarheight.size", -1);
				} else {
					let idx = Array.prototype.indexOf.call(event.currentTarget.children, event.target);
					Services.prefs.setIntPref("extensions.navbarheight.size", sizes[idx]);
				}
			}, false);
		}
	},

	removeOption: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		let sizeMenu = aDOMWindow.document.querySelector("#nbh-size-menu");
		if (sizeMenu) {
			sizeMenu.parentNode.removeChild(sizeMenu);
		}
	},
	
	// If Firefox is starting up it can have document.querySelector("#toolbar-context-menu") === true or === false (!)
	// because AddonManager.getAddonByID() callback is used in startup(data, reason),
	// two subsequent Firefox restarts can produce different results.
	// There is no such a problem when there is no callback in startup(data, reason)
	// in that case it would be always === false
	startup: function () {
		console.log("Nav Bar Height: startup start... !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		
		prefObserver.observe(null, "nsPref:changed", "extensions.navbarheight.size");
		Services.prefs.addObserver("extensions.navbarheight.size", prefObserver, false);
		
		// Add the context menu option into any existing windows:
		// ATTENTION, if you add "navigator:browser" as an argument Firefox can skip windows with any type
		// DO NOT USE getEnumerator("navigator:browser")
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			console.log("Nav Bar Height: hasMoreElements() !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
			let aDOMWindow = DOMWindows.getNext();
			console.log("Nav Bar Height: windowtype: " + aDOMWindow.document.documentElement.getAttribute("windowtype"));
			if (aDOMWindow.document.querySelector("#toolbar-context-menu")) {
				console.log("Nav Bar Height: addOption !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
				// When Firefox is already opened:
				this.addOption(aDOMWindow);
			} else if (
				aDOMWindow.document.documentElement.getAttribute("windowtype") === null || // It's always null at Firefox startup
				aDOMWindow.document.documentElement.getAttribute("windowtype") === "navigator:browser"
			) {
				console.log("Nav Bar Height: 'load' event listener added++++++++++++++++");
				// When Firefox is starting up:
				aDOMWindow.addEventListener('load', function onLoad(event) {
					console.log("Nav Bar Height: 'load' event listener removed------------------");
					aDOMWindow.removeEventListener('load', onLoad, false);
					if (aDOMWindow.document.documentElement.getAttribute("windowtype") === "navigator:browser") {
						windowListener.addOption(aDOMWindow);
					}
				}, false);
			}
		}
		// Listen to new windows:
		Services.wm.addListener(this);

		console.log("Nav Bar Height: startup end... !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
	},
	
	shutdown: function () {
		// Removing an observer that has already been removed won't do any harm:
		Services.prefs.removeObserver("extensions.navbarheight.size", prefObserver);
		URIs.forEach((x) => {
			if (sss.sheetRegistered(x, sss.AUTHOR_SHEET)) {
				sss.unregisterSheet(x, sss.AUTHOR_SHEET);
			}
		});
		if (sss.sheetRegistered(URIff41fix, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(URIff41fix, sss.AUTHOR_SHEET);
		}
		if (sss.sheetRegistered(URIff43fix, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(URIff43fix, sss.AUTHOR_SHEET);
		}
		
		//Stop listening:
		Services.wm.removeListener(this);
		// Remove the context menu option from any existing windows:
		let DOMWindows = Services.wm.getEnumerator("navigator:browser");
		while (DOMWindows.hasMoreElements()) {
			this.removeOption(DOMWindows.getNext());
		}
		console.log("Nav Bar Height: windowListener.shutdown() !!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
	},

	onOpenWindow: function (aXULWindow) {
		// In Gecko 7.0 nsIDOMWindow2 has been merged into nsIDOMWindow interface.
		// In Gecko 8.0 nsIDOMStorageWindow and nsIDOMWindowInternal have been merged into nsIDOMWindow interface.
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function onLoad(event) {
			aDOMWindow.removeEventListener("load", onLoad, false);
			if (aDOMWindow.document.documentElement.getAttribute("windowtype") === "navigator:browser") {
				console.log("Nav Bar Height: onOpenWindow navigator:browser !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
				windowListener.addOption(aDOMWindow);
			}
		}, false);
	}

};

var prefObserver = {
	
	observe: function(subject, topic, data) {
		if (topic == "nsPref:changed") {
			// unload all:
			URIs.forEach((x) => {
				if (sss.sheetRegistered(x, sss.AUTHOR_SHEET)) {
					sss.unregisterSheet(x, sss.AUTHOR_SHEET);
				}
			});
			if (sss.sheetRegistered(URIff41fix, sss.AUTHOR_SHEET)) {
				sss.unregisterSheet(URIff41fix, sss.AUTHOR_SHEET);
			}
			if (sss.sheetRegistered(URIff43fix, sss.AUTHOR_SHEET)) {
				sss.unregisterSheet(URIff43fix, sss.AUTHOR_SHEET);
			}
			
			let pref = Services.prefs.getIntPref("extensions.navbarheight.size");
			let idx = sizes.indexOf(pref);
			if (idx !== -1) {
				sss.loadAndRegisterSheet(URIs[idx], sss.AUTHOR_SHEET);
				sss.loadAndRegisterSheet(URIff41fix, sss.AUTHOR_SHEET);
				sss.loadAndRegisterSheet(URIff43fix, sss.AUTHOR_SHEET);
			}
		}
	}
	
};

var addonListener = {
	
	onEnabling: function (aAddon, needsRestart) {
		if (aAddon.id === "TabsTree@traxium") {
			// Disable itself:
			windowListener.shutdown();
			console.log("Tab Tree is enabling!");
		}
	},

	onDisabled: function (aAddon, needsRestart) {
		if (aAddon.id === "TabsTree@traxium") {
			// Enable itself:
			windowListener.startup();
			console.log("Tab Tree has been disabled!");
		}
	},

	// onEnabling doesn't fire when "Tab Tree" is installing
	// only onInstalling fires (not two events, not onEnabling) when "Tab Tree" is installed
	// But "Tab Tree" can be installed (for example by addons.update-checker) when it's disabled and
	// Nav Bar Height shouldn't do anything in that case:
	onInstalled: function (aAddon) {
		if (aAddon.id === "TabsTree@traxium" && aAddon.isActive) {
			// Disable itself:
			windowListener.shutdown();
			console.log("Tab Tree is installed and active!!");
		} else if (aAddon.id === "TabsTree@traxium") {
			console.log("Tab Tree is installed and disabled!!!");
		}
	},

	// Actually it never fires, when "Tab Tree" is removed onDisabled fires (not onUninstalled)
	// When disabled "Tab Tree" is removed then nothing fires
	onUninstalled: function (aAddon) {
		if (aAddon.id === "TabsTree@traxium") {
			console.log("Tab Tree has been uninstalled!!");
		}
	}
	
};