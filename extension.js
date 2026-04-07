#!/usr/bin/gjs

'use strict';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import Utils from './utils.js';

export default class DayNightWallpaperExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._scheduledTimeoutId = null;
        this._currentMode = null;

        this._connectSettings();
        this._refresh();
    }

    disable() {
        this._disconnectSettings();

        if (this._scheduledTimeoutId) {
            GLib.Source.remove(this._scheduledTimeoutId);
        }
        this._scheduledTimeoutId = null;
        this._currentMode = null;
        this._settings = null;
    }

    _refresh() {
        const nextWallpaperSwitch = this._decideNextWallpaperSwitch();
        
        if (nextWallpaperSwitch.mode == Utils.wallpaperMode.DAY) {
            this._currentMode = Utils.wallpaperMode.NIGHT;
            const nightWallpaperUri = this._settings.get_string('night-wallpaper');
            const nightWallpaperAdjustment = this._settings.get_string('night-wallpaper-adjustment');
            
            const bg = Utils.getDesktopBackgroundSettings();
            bg.set_string('picture-uri', nightWallpaperUri);
            bg.set_string('picture-uri-dark', nightWallpaperUri);
            bg.set_string('picture-options', nightWallpaperAdjustment || 'zoom');
            
            this._scheduleDayWallpaperSwitch(nextWallpaperSwitch.secondsLeftForSwitch);
        } else {
            this._currentMode = Utils.wallpaperMode.DAY;
            const dayWallpaperUri = this._settings.get_string('day-wallpaper');
            const dayWallpaperAdjustment = this._settings.get_string('day-wallpaper-adjustment');
            
            const bg = Utils.getDesktopBackgroundSettings();
            bg.set_string('picture-uri', dayWallpaperUri);
            bg.set_string('picture-uri-dark', dayWallpaperUri);
            bg.set_string('picture-options', dayWallpaperAdjustment || 'zoom');
            
            this._scheduleNightWallpaperSwitch(nextWallpaperSwitch.secondsLeftForSwitch);
        }
    }

    _setDesktopBackground(uri, adjustment) {
        log(`Setting desktop background => ${uri}, ${adjustment}`);
        const backgroundSettings = Utils.getDesktopBackgroundSettings();
        backgroundSettings.set_string('picture-uri', uri);
        backgroundSettings.set_string('picture-uri-dark', uri);
        backgroundSettings.set_string('picture-options', adjustment);
    }

    _setDesktopBackgroundImage(uri) {
        log(`_setDesktopBackgroundImage called with: ${uri}`);
        const backgroundSettings = Utils.getDesktopBackgroundSettings();
        backgroundSettings.set_string('picture-uri', uri);
        backgroundSettings.set_string('picture-uri-dark', uri);
    }

    _getDesktopBackgroundImage() {
        const backgroundSettings = Utils.getDesktopBackgroundSettings();
        return backgroundSettings.get_string('picture-uri');
    }

    _getDesktopBackgroundImageDark() {
        const backgroundSettings = Utils.getDesktopBackgroundSettings();
        return backgroundSettings.get_string('picture-uri-dark');
    }

    _setDesktopBackgroundAdjustment(adjustment) {
        log(`Setting desktop background adjustment => ${adjustment}`);
        const backgroundSettings = Utils.getDesktopBackgroundSettings();
        backgroundSettings.set_string('picture-options', adjustment);
    }

    _getDesktopBackgroundAdjustment() {
        const backgroundSettings = Utils.getDesktopBackgroundSettings();
        return backgroundSettings.get_string('picture-options');
    }

    _decideNextWallpaperSwitch() {
        const dayWallpaperSwitchTime = Utils.SwitchTime.newFromSettings(this._settings.get_double('day-wallpaper-switch-time'));
        const nightWallpaperSwitchTime = Utils.SwitchTime.newFromSettings(this._settings.get_double('night-wallpaper-switch-time'));

        const now = GLib.DateTime.new_now_local();
        const secondsLeftForDayWallpaperSwitch = this._calculateSecondsLeftForSwitch(dayWallpaperSwitchTime, now);
        const secondsLeftForNightWallpaperSwitch = this._calculateSecondsLeftForSwitch(nightWallpaperSwitchTime, now);

        if (secondsLeftForDayWallpaperSwitch <= secondsLeftForNightWallpaperSwitch) {
            return new Utils.NextWallpaperSwitch(Utils.wallpaperMode.DAY, secondsLeftForDayWallpaperSwitch);
        } else {
            return new Utils.NextWallpaperSwitch(Utils.wallpaperMode.NIGHT, secondsLeftForNightWallpaperSwitch);
        }
    }

    _calculateSecondsLeftForSwitch(switchTime, now) {
        const switchDateTime = this._constructSwitchDateTime(switchTime, now);
        return switchDateTime.to_unix() - now.to_unix();
    }

    _constructSwitchDateTime(switchTime, now) {
        let timezone = GLib.TimeZone.new_local();
        let switchDateTime = GLib.DateTime.new(
            timezone,
            now.get_year(),
            now.get_month(),
            now.get_day_of_month(),
            switchTime.switchHour,
            switchTime.switchMinute,
            0.0
        );

        const nowHour = now.get_hour();
        if (switchTime.switchHour == nowHour) {
            const nowMinute = now.get_minute();
            if (switchTime.switchMinute <= nowMinute) {
                switchDateTime = switchDateTime.add_days(1);
            }
        } else if (switchTime.switchHour < nowHour) {
            switchDateTime = switchDateTime.add_days(1);
        }

        return switchDateTime;
    }

    _onDayWallpaperTimeout() {
        this._currentMode = Utils.wallpaperMode.DAY;
        const uri = this._settings.get_string('day-wallpaper');
        const adjustment = this._settings.get_string('day-wallpaper-adjustment');
        
        const bg = Utils.getDesktopBackgroundSettings();
        bg.set_string('picture-uri', uri);
        bg.set_string('picture-uri-dark', uri);
        bg.set_string('picture-options', adjustment || 'zoom');
        
        this._scheduleNightWallpaperSwitch();
        return GLib.SOURCE_REMOVE;
    }

    _onNightWallpaperTimeout() {
        this._currentMode = Utils.wallpaperMode.NIGHT;
        const uri = this._settings.get_string('night-wallpaper');
        const adjustment = this._settings.get_string('night-wallpaper-adjustment');
        
        const bg = Utils.getDesktopBackgroundSettings();
        bg.set_string('picture-uri', uri);
        bg.set_string('picture-uri-dark', uri);
        bg.set_string('picture-options', adjustment || 'zoom');
        
        this._scheduleDayWallpaperSwitch();
        return GLib.SOURCE_REMOVE;
    }

    _scheduleDayWallpaperSwitch(secondsLeftForDayWallpaperSwitch) {
        log('Scheduling switch for day wallpaper...');
        if (secondsLeftForDayWallpaperSwitch == undefined) {
            const daySwitchTime = Utils.SwitchTime.newFromSettings(this._settings.get_double('day-wallpaper-switch-time'));
            const now = GLib.DateTime.new_now_local();
            secondsLeftForDayWallpaperSwitch = this._calculateSecondsLeftForSwitch(daySwitchTime, now);
        }
        this._scheduledTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, secondsLeftForDayWallpaperSwitch, this._onDayWallpaperTimeout.bind(this));
    }

    _scheduleNightWallpaperSwitch(secondsLeftForNightWallpaperSwitch) {
        log('Scheduling switch for night wallpaper...');
        if (secondsLeftForNightWallpaperSwitch == undefined) {
            const nightSwitchTime = Utils.SwitchTime.newFromSettings(this._settings.get_double('night-wallpaper-switch-time'));
            const now = GLib.DateTime.new_now_local();
            secondsLeftForNightWallpaperSwitch = this._calculateSecondsLeftForSwitch(nightSwitchTime, now);
        }
        this._scheduledTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, secondsLeftForNightWallpaperSwitch, this._onNightWallpaperTimeout.bind(this));
    }

    _onWallpaperSwitchTimeChanged() {
        if (this._scheduledTimeoutId) {
            GLib.Source.remove(this._scheduledTimeoutId);
        }

        this._scheduledTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            this._refresh();
            return GLib.SOURCE_REMOVE;
        });
    }

    _onDayWallpaperChanged() {
        const dayWallpaperUri = this._settings.get_string('day-wallpaper');
        const bg = Utils.getDesktopBackgroundSettings();
        bg.set_string('picture-uri', dayWallpaperUri);
        bg.set_string('picture-uri-dark', dayWallpaperUri);
    }

    _onNightWallpaperChanged() {
        const nightWallpaperUri = this._settings.get_string('night-wallpaper');
        const bg = Utils.getDesktopBackgroundSettings();
        bg.set_string('picture-uri', nightWallpaperUri);
        bg.set_string('picture-uri-dark', nightWallpaperUri);
    }

    _onDayWallpaperAdjustmentChanged() {
        const dayWallpaperAdjustment = this._settings.get_string('day-wallpaper-adjustment');
        const bg = Utils.getDesktopBackgroundSettings();
        bg.set_string('picture-options', dayWallpaperAdjustment || 'zoom');
    }

    _onNightWallpaperAdjustmentChanged() {
        const nightWallpaperAdjustment = this._settings.get_string('night-wallpaper-adjustment');
        const bg = Utils.getDesktopBackgroundSettings();
        bg.set_string('picture-options', nightWallpaperAdjustment || 'zoom');
    }

    _connectSettings() {
        this._onDayWallpaperSwitchTimeChangedId = this._settings.connect('changed::day-wallpaper-switch-time', this._onWallpaperSwitchTimeChanged.bind(this));
        this._onNightWallpaperSwitchTimeChangedId = this._settings.connect('changed::night-wallpaper-switch-time', this._onWallpaperSwitchTimeChanged.bind(this));
        this._onDayWallpaperChangedId = this._settings.connect('changed::day-wallpaper', this._onDayWallpaperChanged.bind(this));
        this._onNightWallpaperChangedId = this._settings.connect('changed::night-wallpaper', this._onNightWallpaperChanged.bind(this));
        this._onDayWallpaperAdjustmentChangedId = this._settings.connect('changed::day-wallpaper-adjustment', this._onDayWallpaperAdjustmentChanged.bind(this));
        this._onNightWallpaperAdjustmentChangedId = this._settings.connect('changed::night-wallpaper-adjustment', this._onNightWallpaperAdjustmentChanged.bind(this));
    }

    _disconnectSettings() {
        if (this._onDayWallpaperSwitchTimeChangedId) {
            this._settings.disconnect(this._onDayWallpaperSwitchTimeChangedId);
            this._onDayWallpaperSwitchTimeChangedId = null;
        }
        if (this._onNightWallpaperSwitchTimeChangedId) {
            this._settings.disconnect(this._onNightWallpaperSwitchTimeChangedId);
            this._onNightWallpaperSwitchTimeChangedId = null;
        }
        if (this._onDayWallpaperChangedId) {
            this._settings.disconnect(this._onDayWallpaperChangedId);
            this._onDayWallpaperChangedId = null;
        }
        if (this._onNightWallpaperChangedId) {
            this._settings.disconnect(this._onNightWallpaperChangedId);
            this._onNightWallpaperChangedId = null;
        }
        if (this._onDayWallpaperAdjustmentChangedId) {
            this._settings.disconnect(this._onDayWallpaperAdjustmentChangedId);
            this._onDayWallpaperAdjustmentChangedId = null;
        }
        if (this._onNightWallpaperAdjustmentChangedId) {
            this._settings.disconnect(this._onNightWallpaperAdjustmentChangedId);
            this._onNightWallpaperAdjustmentChangedId = null;
        }
    }
}