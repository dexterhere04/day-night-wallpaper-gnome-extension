#!/usr/bin/gjs

'use strict';

import Gio from 'gi://Gio';

export const wallpaperMode = {
    DAY: 1,
    NIGHT: 2
};

export function getDesktopBackgroundSettings() {
    return Gio.Settings.new('org.gnome.desktop.background');
}

export function getAvailablePictureOptions() {
    const backgroundSettings = getDesktopBackgroundSettings();
    const schema = backgroundSettings.settings_schema;
    const key = schema.get_key('picture-options');
    return key.get_range().get_child_value(1).get_child_value(0).deep_unpack();
}

export function isWallpaperOptionSelected(extensionSettings, wallpaperKey) {
    return extensionSettings.get_string(wallpaperKey) != '';
}

export function fallbackToSystemWallpaper(extensionSettings, wallpaperKey) {
    const backgroundSettings = getDesktopBackgroundSettings();
    const systemBackgroundUri = backgroundSettings.get_string('picture-uri');
    extensionSettings.set_string(wallpaperKey, systemBackgroundUri);
}

export function fallbackToSystemWallpaperAdjustment(extensionSettings, wallpaperAdjustmentKey) {
    const backgroundSettings = getDesktopBackgroundSettings();
    const systemBackgroundAdjustment = backgroundSettings.get_string('picture-options');
    extensionSettings.set_string(wallpaperAdjustmentKey, systemBackgroundAdjustment);
}

const SCHEMA_ID = 'org.gnome.shell.extensions.day-night-wallpaper';

function getExtensionSettings() {
    return Gio.Settings.new(SCHEMA_ID);
}

export function checkExtensionSettings() {
    const extensionSettings = getExtensionSettings();
    if (!extensionSettings) {
        log('Could not get extension settings');
        return;
    }

    if (!isWallpaperOptionSelected(extensionSettings, 'day-wallpaper')) {
        fallbackToSystemWallpaper(extensionSettings, 'day-wallpaper');
    }

    if (!isWallpaperOptionSelected(extensionSettings, 'day-wallpaper-adjustment')) {
        fallbackToSystemWallpaperAdjustment(extensionSettings, 'day-wallpaper-adjustment');
    }

    if (!isWallpaperOptionSelected(extensionSettings, 'night-wallpaper')) {
        fallbackToSystemWallpaper(extensionSettings, 'night-wallpaper');
    }

    if (!isWallpaperOptionSelected(extensionSettings, 'night-wallpaper-adjustment')) {
        fallbackToSystemWallpaperAdjustment(extensionSettings, 'night-wallpaper-adjustment');
    }
}

export class SwitchTime {
    constructor(switchHour, switchMinute) {
        this._switchHour = switchHour;
        this._switchMinute = switchMinute;
    }

    get switchHour() {
        return this._switchHour;
    }

    get switchMinute() {
        return this._switchMinute;
    }

    toSettingsFormat() {
        let decimal = this._switchMinute / 60;
        decimal = parseFloat(decimal.toFixed(2));
        return this._switchHour + decimal;
    }

    static newFromSettings(switchTimeFromSettings) {
        let switchHour = parseInt(switchTimeFromSettings);
        let decimal = switchTimeFromSettings - switchHour;
        decimal = parseFloat(decimal.toFixed(2));
        let switchMinute = Math.round(decimal * 60);
        return new SwitchTime(switchHour, switchMinute);
    }
}

export class NextWallpaperSwitch {
    constructor(mode, secondsLeftForSwitch) {
        this._mode = mode;
        this._secondsLeftForSwitch = secondsLeftForSwitch;
    }

    get mode() {
        return this._mode;
    }

    get secondsLeftForSwitch() {
        return this._secondsLeftForSwitch;
    }
}

export function isDayNow(daySwitchTime, nightSwitchTime) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const dayTimeMinutes = Math.floor(daySwitchTime) * 60 + Math.round((daySwitchTime % 1) * 60);
    const nightTimeMinutes = Math.floor(nightSwitchTime) * 60 + Math.round((nightSwitchTime % 1) * 60);
    
    if (dayTimeMinutes < nightTimeMinutes) {
        return currentTimeMinutes >= dayTimeMinutes && currentTimeMinutes < nightTimeMinutes;
    } else {
        return currentTimeMinutes >= dayTimeMinutes || currentTimeMinutes < nightTimeMinutes;
    }
}

export default {
    wallpaperMode,
    getDesktopBackgroundSettings,
    getAvailablePictureOptions,
    isWallpaperOptionSelected,
    fallbackToSystemWallpaper,
    fallbackToSystemWallpaperAdjustment,
    checkExtensionSettings,
    SwitchTime,
    NextWallpaperSwitch,
    isDayNow
};