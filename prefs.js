#!/usr/bin/gjs

'use strict';

import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import SettingsUi from './settingsUi.js';
import { SwitchTime, getAvailablePictureOptions, isDayNow } from './utils.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.day-night-wallpaper';

function getSettings() {
    return Gio.Settings.new(SCHEMA_ID);
}

export default class DayNightWallpaperPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = getSettings();
        const pictureOptions = getAvailablePictureOptions().sort();

        const imageFileFilter = new Gtk.FileFilter();
        imageFileFilter.set_name('Image files');
        imageFileFilter.add_mime_type('image/jpg');
        imageFileFilter.add_mime_type('image/png');
        imageFileFilter.add_mime_type('image/jpeg');
        imageFileFilter.add_mime_type('image/bmp');

        const page = new Adw.PreferencesPage();
        
        const dayGroup = new Adw.PreferencesGroup();
        dayGroup.set_title('Day Wallpaper');
        page.add(dayGroup);

        const dayImageRow = new Adw.ActionRow({ title: 'Image' });
        const dayImageButton = new Gtk.Button({ label: 'Choose...' });
        dayImageRow.add_suffix(dayImageButton);
        dayImageRow.set_activatable_widget(dayImageButton);
        dayGroup.add(dayImageRow);

        const dayAdjRow = new Adw.ActionRow({ title: 'Adjustment' });
        const dayAdjustmentCombo = new Gtk.ComboBoxText();
        pictureOptions.forEach(opt => dayAdjustmentCombo.append_text(opt.charAt(0).toUpperCase() + opt.slice(1)));
        dayAdjustmentCombo.set_active(0);
        dayAdjRow.add_suffix(dayAdjustmentCombo);
        dayAdjRow.set_activatable_widget(dayAdjustmentCombo);
        dayGroup.add(dayAdjRow);

        const dayTimeRow = new Adw.ActionRow({ title: 'Switch Time (24h)' });
        const dayTimeWidget = new SettingsUi.SwitchTimeWidget();
        dayTimeRow.add_suffix(dayTimeWidget);
        dayTimeRow.set_activatable_widget(dayTimeWidget.hourSpinButton);
        dayGroup.add(dayTimeRow);

        const nightGroup = new Adw.PreferencesGroup();
        nightGroup.set_title('Night Wallpaper');
        page.add(nightGroup);

        const nightImageRow = new Adw.ActionRow({ title: 'Image' });
        const nightImageButton = new Gtk.Button({ label: 'Choose...' });
        nightImageRow.add_suffix(nightImageButton);
        nightImageRow.set_activatable_widget(nightImageButton);
        nightGroup.add(nightImageRow);

        const nightAdjRow = new Adw.ActionRow({ title: 'Adjustment' });
        const nightAdjustmentCombo = new Gtk.ComboBoxText();
        pictureOptions.forEach(opt => nightAdjustmentCombo.append_text(opt.charAt(0).toUpperCase() + opt.slice(1)));
        nightAdjustmentCombo.set_active(0);
        nightAdjRow.add_suffix(nightAdjustmentCombo);
        nightAdjRow.set_activatable_widget(nightAdjustmentCombo);
        nightGroup.add(nightAdjRow);

        const nightTimeRow = new Adw.ActionRow({ title: 'Switch Time (24h)' });
        const nightTimeWidget = new SettingsUi.SwitchTimeWidget();
        nightTimeRow.add_suffix(nightTimeWidget);
        nightTimeRow.set_activatable_widget(nightTimeWidget.hourSpinButton);
        nightGroup.add(nightTimeRow);

        window.add(page);

        const daySwitchTime = SwitchTime.newFromSettings(settings.get_double('day-wallpaper-switch-time'));
        dayTimeWidget.setSwitchTime(daySwitchTime.switchHour, daySwitchTime.switchMinute);

        const nightSwitchTime = SwitchTime.newFromSettings(settings.get_double('night-wallpaper-switch-time'));
        nightTimeWidget.setSwitchTime(nightSwitchTime.switchHour, nightSwitchTime.switchMinute);

        const currentDayWallpaper = settings.get_string('day-wallpaper');
        if (currentDayWallpaper) {
            try {
                const file = Gio.File.new_for_uri(currentDayWallpaper);
                dayImageButton.set_label(file.get_basename().substring(0, 20) || 'Choose...');
            } catch (e) {}
        }

        const currentNightWallpaper = settings.get_string('night-wallpaper');
        if (currentNightWallpaper) {
            try {
                const file = Gio.File.new_for_uri(currentNightWallpaper);
                nightImageButton.set_label(file.get_basename().substring(0, 20) || 'Choose...');
            } catch (e) {}
        }

        dayImageButton.connect('clicked', () => {
            const file = Gtk.FileChooserNative.new(
                'Select Day Wallpaper',
                null,
                Gtk.FileChooserAction.OPEN,
                '_Open',
                '_Cancel'
            );
            
            file.connect('response', (dlg, response) => {
                if (response === Gtk.ResponseType.ACCEPT) {
                    const selectedFile = dlg.get_file();
                    if (selectedFile) {
                        const uri = selectedFile.get_uri();
                        settings.set_string('day-wallpaper', uri);
                        dayImageButton.set_label(selectedFile.get_basename().substring(0, 20));
                        
                        const daySwitchTime = settings.get_double('day-wallpaper-switch-time');
                        const nightSwitchTime = settings.get_double('night-wallpaper-switch-time');
                        const isCurrentlyDay = isDayNow(daySwitchTime, nightSwitchTime);
                        
                        if (isCurrentlyDay) {
                            const bg = Gio.Settings.new('org.gnome.desktop.background');
                            bg.set_string('picture-uri', uri);
                            bg.set_string('picture-uri-dark', uri);
                        }
                    }
                }
                dlg.destroy();
            });
            file.show();
        });

        nightImageButton.connect('clicked', () => {
            const file = Gtk.FileChooserNative.new(
                'Select Night Wallpaper',
                null,
                Gtk.FileChooserAction.OPEN,
                '_Open',
                '_Cancel'
            );
            
            file.connect('response', (dlg, response) => {
                if (response === Gtk.ResponseType.ACCEPT) {
                    const selectedFile = dlg.get_file();
                    if (selectedFile) {
                        const uri = selectedFile.get_uri();
                        settings.set_string('night-wallpaper', uri);
                        nightImageButton.set_label(selectedFile.get_basename().substring(0, 20));
                        
                        const daySwitchTime = settings.get_double('day-wallpaper-switch-time');
                        const nightSwitchTime = settings.get_double('night-wallpaper-switch-time');
                        const isCurrentlyDay = isDayNow(daySwitchTime, nightSwitchTime);
                        
                        if (!isCurrentlyDay) {
                            const bg = Gio.Settings.new('org.gnome.desktop.background');
                            bg.set_string('picture-uri', uri);
                            bg.set_string('picture-uri-dark', uri);
                        }
                    }
                }
                dlg.destroy();
            });
            file.show();
        });

        dayTimeWidget.hourSpinButton.connect('value-changed', () => {
            const hour = dayTimeWidget.hourSpinButton.get_value_as_int();
            const minute = dayTimeWidget.minuteSpinButton.get_value_as_int();
            const time = new SwitchTime(hour, minute);
            settings.set_double('day-wallpaper-switch-time', time.toSettingsFormat());
        });

        dayTimeWidget.minuteSpinButton.connect('value-changed', () => {
            const hour = dayTimeWidget.hourSpinButton.get_value_as_int();
            const minute = dayTimeWidget.minuteSpinButton.get_value_as_int();
            const time = new SwitchTime(hour, minute);
            settings.set_double('day-wallpaper-switch-time', time.toSettingsFormat());
        });

        nightTimeWidget.hourSpinButton.connect('value-changed', () => {
            const hour = nightTimeWidget.hourSpinButton.get_value_as_int();
            const minute = nightTimeWidget.minuteSpinButton.get_value_as_int();
            const time = new SwitchTime(hour, minute);
            settings.set_double('night-wallpaper-switch-time', time.toSettingsFormat());
        });

        nightTimeWidget.minuteSpinButton.connect('value-changed', () => {
            const hour = nightTimeWidget.hourSpinButton.get_value_as_int();
            const minute = nightTimeWidget.minuteSpinButton.get_value_as_int();
            const time = new SwitchTime(hour, minute);
            settings.set_double('night-wallpaper-switch-time', time.toSettingsFormat());
        });
    }
}
