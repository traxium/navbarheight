/*
 * This file is part of Nav Bar Height,
 * Copyright (C) 2015 Sergey Zelentsov <crayfishexterminator@gmail.com>
 */

"use strict";
/* global Components, Services, AddonManager, APP_SHUTDOWN */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/AddonManager.jsm");

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
	Cu.import(data.resourceURI.spec + "modules/NavBarHeight/NavBarHeight.jsm");
	NavBarHeight.data = data;
	NavBarHeight.packageName = "navbarheight";

	// Tab Tree takes priority over this add-on if Tab Tree is installed and enabled
	AddonManager.getAddonByID("TabsTree@traxium", (aAddon) => {
		// If an error occurred (such as an add-on not being found), null is passed back instead.
		if (aAddon && aAddon.isActive) {
			// If "Tab Tree" is installed and enabled
			// Do nothing
		} else {
			// If "Tab Tree" is not installed or disabled:
			NavBarHeight.init();
		}

		AddonManager.addAddonListener(addonListener);
	});
}

function shutdown(data, reason)
{
	if (reason === APP_SHUTDOWN) {
		return;
	}

	AddonManager.removeAddonListener(addonListener);

	AddonManager.getAddonByID("TabsTree@traxium", (tabTree) => {
		// If an error occurred (such as an add-on not being found), null is passed back instead.
		if (!tabTree || !tabTree.isActive) {
			NavBarHeight.uninit();
		}
		Cu.unload(data.resourceURI.spec + "modules/NavBarHeight/NavBarHeight.jsm");
	});
}

function install(aData, aReason) { }
function uninstall(aData, aReason) { }

var addonListener = {
	
	/* AddonListener */

	onEnabling: function (aAddon, needsRestart) {
		if (aAddon.id === "TabsTree@traxium") {
			// Disable itself:
			NavBarHeight.uninit();
		}
	},

	onDisabled: function (aAddon, needsRestart) {
		if (aAddon.id === "TabsTree@traxium") {
			// Enable itself:
			NavBarHeight.init();
		}
	},

	// onEnabling doesn't fire when "Tab Tree" is installing
	// only onInstalling fires (not two events, not onEnabling) when "Tab Tree" is installed
	// But "Tab Tree" can be installed (for example by addons.update-checker) when it's disabled and
	// Nav Bar Height shouldn't do anything in that case:
	onInstalled: function (aAddon) {
		if (aAddon.id === "TabsTree@traxium" && aAddon.isActive) {
			// Disable itself:
			NavBarHeight.uninit();
		}
	},

	// Actually I have never seen it fires, when "Tab Tree" is removed onDisabled fires (not onUninstalled)
	// When disabled "Tab Tree" is removed then nothing fires
	onUninstalled: function (aAddon) {
		//if (aAddon.id === "TabsTree@traxium") {
		//}
	},
	
};