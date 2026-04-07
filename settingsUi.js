#!/usr/bin/gjs

'use strict';

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

var SwitchTimeWidget = GObject.registerClass(
class SwitchTimeWidget extends Gtk.Box {
    _init() {
        super._init({
            spacing: 4,
            halign: Gtk.Align.CENTER,
            orientation: Gtk.Orientation.HORIZONTAL
        })

        const _hourSpinAdustment = new Gtk.Adjustment({
            lower: 0,
            upper: 23,
            step_increment: 1
        });
        const _minuteSpinAdustment = new Gtk.Adjustment({
            lower: 0,
            upper: 59,
            step_increment: 1
        });
        const _timeColonLabel = Gtk.Label.new(' : ');

        this.hourSpinButton = new Gtk.SpinButton({
            adjustment: _hourSpinAdustment,
            wrap: true,
            width_chars: 2,
            max_width_chars: 2,
            snap_to_ticks: true,
            numeric: true
        });

        this.minuteSpinButton = new Gtk.SpinButton({
            adjustment: _minuteSpinAdustment,
            wrap: true,
            width_chars: 2,
            max_width_chars: 2,
            snap_to_ticks: true,
            numeric: true
        });

        this.hourSpinButton.connect('output', this._padValueWithLeadingZero.bind(this));
        this.minuteSpinButton.connect('output', this._padValueWithLeadingZero.bind(this));

        this.append(this.hourSpinButton);
        this.append(_timeColonLabel);
        this.append(this.minuteSpinButton);
    }

    setSwitchTime(switchHour, switchMinute) {
        this.hourSpinButton.set_value(switchHour);
        this.minuteSpinButton.set_value(switchMinute);
    }

    _padValueWithLeadingZero(spinButton) {
        const adjustment = spinButton.get_adjustment();
        const value = parseInt(adjustment.get_value());
        const paddedValue = (value < 10 ? '0' : '') + value;
        spinButton.set_text(paddedValue);
        return true;
    }
});

var AboutSection = GObject.registerClass(
class AboutSection extends Gtk.Box {
    _init() {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            halign: Gtk.Align.CENTER,
            margin_top: 18
        })

        const createdByLabel = new Gtk.Label({
            label: '<span font="10" foreground="#6c757d">Created by Swapnil Madavi</span>',
            halign: Gtk.Align.CENTER,
            use_markup: true
        });

        const homepageLabel = new Gtk.Label({
            label: '<a href="https://github.com/swapnilmadavi/day-night-wallpaper-gnome-extension"><span foreground="#6c757d">Homepage</span></a>',
            halign: Gtk.Align.CENTER,
            use_markup: true
        });

        this.append(createdByLabel);
        this.append(homepageLabel);
    }
});

export default {
    SwitchTimeWidget,
    AboutSection
};
