/*
 * jQuery Date Range Picker
 *
 * Depends:
 *   jquery-1.4.2.js
 *   ui.core.js
 *
 * Synopsis:
 *
 *   $("input#date").daterange({ days: "input#days" });
 *
 * Description:
 *
 *   Creates a drop-down calendar widget that allows you to fill in a
 *   date range.  The target element holds the start date.  You should
 *   specify either (or both) of the "days" and "end" options.  The
 *   "days" option specifies the jQuery selector of the INPUT element
 *   that will receive the number of days in the date range.  The
 *   "end" option specifies the jQuery selector of the INPUT element
 *   that will receive the end date of the date range.
 *
 *   Make sure to use "ui.daterange.css" so that things get styled
 *   correctly.
 *
 * Options:
 *
 *   days (optional): a jQuery selector that identifies the INPUT
 *   element that will receive the number of days in the range.
 *
 *   end (optional): a jQuery selector that identifies the INPUT
 *   element that will receive the end date of the date range.
 *
 *   format (optional): the date format to use, one of "js" or "iso".
 *
 *   nmonths (optional): the number of months that should be displayed
 *   in the picker.  The default is three.
 *
 *   nofuture (optional): if set to true (the default), then future
 *   dates may not be selected.
 */

(function($) {

var defaults = {
    format: "iso",
    nmonths: 3,
    nofuture: true
};

$.widget("ui.daterange",
{
    options: defaults,

    _init: function()
    {
        var o = this.options, self = this,
            uiStartDate = this.uiStartDate = $(this.element),
            uiContainer = o.container ? $(o.container) : uiStartDate.parent(),
            uiDropDown = $("<div class='dr-dropdown'/>").appendTo(uiContainer),
            uiPanel = self.uiPanel = $("<div class='dr-panel'/>").appendTo(uiContainer),
            uiLeft = $("<div class='dr-scroll dr-left'/>").appendTo(uiPanel),
            uiCalendarContainer = $("<div class='dr-calendar-container'/>").appendTo(uiPanel),
            uiCalendar = self.uiCalendar = $("<div class='dr-calendar'/>").appendTo(uiCalendarContainer),
            uiRight = this.uiRight = $("<div class='dr-scroll dr-right'/>").appendTo(uiPanel),
            uiClose = $("<button class='dr-close'>Close</button>").appendTo(uiPanel),
            open = false;

        if (o.days)
            this.uiDays = $(o.days);
        if (o.end)
            this.uiEndDate = $(o.end);

        // XXX why don't these get set via "options" or "defaults"?
        this.options.format = this.options.format || "iso";
        this.options.nmonths = this.options.nmonths || 3;

        if (this.options.nofuture === undefined)
            this.options.nofuture = true;

        uiLeft.click(function() {
            if (--self.scrollIndex < 0) {
                var d = new Date(self.months[0].date), uiMonth;
                d.setMonth(d.getMonth() - 1);
                uiMonth = self._renderMonth(d).prependTo(uiCalendar);
                self.months.unshift({ date: d, uiMonth: uiMonth });
                self.scrollIndex = 0;
            }

            self._setScroll();
        });

        uiRight.click(function() {
            if (++self.scrollIndex >= self.months.length - self.options.nmonths) {
                var d = new Date(self.months[self.months.length - 1].date), uiMonth;
                d.setMonth(d.getMonth() + 1);
                uiMonth = self._renderMonth(d).appendTo(uiCalendar);
                self.months.push({ date: d, uiMonth: uiMonth });
            }

            self._setScroll();
        });

        uiDropDown.click(function() {
            self[open ? "hide" : "show"]();
            open = !open;
            uiDropDown[open ? "addClass" : "removeClass"]("dr-open");
        });

        uiClose.click(function() {
            self.hide();
            open = false;
            uiDropDown.removeClass("dr-open");
            return false;
        });
    },

    show: function() {
        var start = this.uiStartDate.val(),
            end = this.uiEndDate ? this.uiEndDate.val() : null,
            days = this.uiDays ? Math.max(Number(this.uiDays.val()) || 0, 1) : 0,
            first, last;

        this.markers = [ ];

        // Translate start day plus days into a first and last date.
        if (start)
            first = parseDate(start, formats[this.options.format][0]);
        if (end)
            last = parseDate(end, formats[this.options.format][0]);

        if (days && !first) {
            last = last || today();
            first = new Date(last);
            first.setDate(first.getDate() - days + 1);
        }

        if (days && !last) {
            last = new Date(first);
            last.setDate(last.getDate() + Number(days) - 1);
        }

        // Default both to today if *nothing* is available.
        first = first || today();
        last = last || today();

        this.first = first;
        this.last = last;
        this.months = [ ];

        for (var d = floorMonth(last);
             d >= first || this.months.length < 3;
             d.setMonth(d.getMonth() - 1))
        {
            var uiMonth = this._renderMonth(d).prependTo(this.uiCalendar);
            this.months.unshift({ date: new Date(d), uiMonth: uiMonth });
        }

        this._markRange();
        this.scrollIndex = this.months.length - 3;

        this._setScroll();

        this.uiStartDate.attr("disabled", true);
        if (this.uiDays)
            this.uiDays.attr("disabled", true);
        if (this.uiEndDate)
            this.uiEndDate.attr("disabled", true);

        this.uiPanel.show();
    },

    _setScroll: function()
    {
        var month = this.months[this.scrollIndex],
            offset = month.uiMonth.position();

        this.uiCalendar.css({ left: -offset.left });

        if (this.options.nofuture) {
            var index = Math.min(this.scrollIndex + this.options.nmonths, this.months.length) - 1,
                d = new Date(this.months[index].date);
            d.setMonth(d.getMonth() + 1);
            this.uiRight.css({ visibility: (d > today() ? "hidden" : "visible") });
        }
    },

    hide: function()
    {
        this.uiPanel.hide();
        this.uiCalendar.empty();
        this.markers = [ ];
        this.months = [ ];
        this.uiStartDate.removeAttr("disabled");
        if (this.uiDays)
            this.uiDays.removeAttr("disabled");
        if (this.uiEndDate)
            this.uiEndDate.removeAttr("disabled");
    },

    _renderMonth: function(d0)
    {
        var self = this, d = floorMonth(d0),
            uiMonth = $("<div class='dr-month'/>"),
            uiWeek, uiStartDate,
            t = today(), todaysDate;

        todaysDate = t.getYear() == d0.getYear() && t.getMonth() == d0.getMonth()
            ? t.getDate()
            : 0;

        var month = d.getMonth(), name = MONTHS[month] + (month == 0 ? " " + d.getFullYear() : "");
        $("<div class='dr-month-name'/>").html(name).appendTo(uiMonth);

        uiWeek = $("<div class='dr-month-days'/>").appendTo(uiMonth);
        for (var i = 0; i < DAYS.length; ++i)
            $("<div class='dr-day'>" + DAYS[i] + "</div>").appendTo(uiWeek);

        // Start redering on the previous Sunday.
        d.setDate(d.getDate() - d.getDay());

        uiWeek = $("<div class='dr-week'/>").appendTo(uiMonth);
        for ( ; d.getMonth() != d0.getMonth(); d.setDate(d.getDate() + 1))
            makeDate(d).addClass("dr-overflow").appendTo(uiWeek);

        for ( ; d.getMonth() == d0.getMonth(); d.setDate(d.getDate() + 1)) {
            if (d.getDay() == 0)
                uiWeek = $("<div class='dr-week'/>").appendTo(uiMonth);

            uiStartDate = makeDate(d).appendTo(uiWeek);
            if (d.getDate() == todaysDate)
                uiStartDate.addClass("dr-today");
        }

        for ( ; d.getDay() != 0; d.setDate(d.getDate() + 1))
            makeDate(d).addClass("dr-overflow").appendTo(uiWeek);

        return uiMonth;

        function makeDate(date0) {
            var date = new Date(date0),
                uiStartDate = $("<div class='dr-date'>" + date.getDate() + "</div>");

            if (self.options.nofuture && date > t) {
                uiStartDate.addClass("dr-future");
                return uiStartDate;
            }

            uiStartDate.click(function() {
                if (self.first && self.last) {
                    self.first = date;
                    self.last = undefined;
                }
                else {
                    if (date < self.first) {
                        self.last = self.first;
                        self.first = date;
                    }
                    else
                        self.last = date;
                }

                self.uiStartDate.val(formats[self.options.format][1](self.first));

                if (self.uiDays) {
                    var days = self.last ? Math.round((self.last - self.first) / 86400000) : 0;
                    self.uiDays.val(days + 1);
                }

                if (self.uiEndDate)
                    self.uiEndDate.val(formats[self.options.format][1](self.last || self.first));

                self._markRange();
            });

            self.markers.push(function() {
                var inrange = self.first == date || self.first <= date && date <= self.last;
                uiStartDate[inrange ? "addClass" : "removeClass"]("dr-inrange");
            });

            return uiStartDate;
        }
    },

    _markRange: function()
    {
        for (var i = 0; i < this.markers.length; ++i)
            this.markers[i]();
    },

    _map: function(date, elt)
    {
        var key = date.toLocaleDateString(), dates = this.datemap[key] || [ ];
        dates.push(elt);
        this.datemap[key] = dates;
    }
});

$.extend($.ui.daterange({ defaults: defaults }));

function zpad(s, n)
{
    s = String(s);
    while (s.length < n)
        s = "0" + s;
    return s;
}

var formats = {
    js: [
            function(s) { return new Date(s); },
            function(d) { return d.toLocaleDateString(); }
        ],
    iso: [
            function(s) {
                var parts = s.split("-");
                return new Date(parts[0], parts[1] - 1, parts[2]);
            },
            function(d) {
                return [
                    d.getFullYear(), zpad(d.getMonth() + 1, 2), zpad(d.getDate(), 2)
                ].join("-");
            }
        ]
};

var MONTHS = "January February March April May June July August September October November December".split(" ");
var DAYS = "SMTWTFS".split("");

function floorDay(d0)
{
    var d = new Date(d0)
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

function floorMonth(d0)
{
    var d = floorDay(d0);
    d.setDate(1);
    return d;
}

function today()
{
    return floorDay(new Date());
}

function parseDate(str, preferredParser)
{
    var date = tryParser(preferredParser);
    if (date)
        return date;

    for (var format in formats) {
        var parser = formats[format][0];
        if (parser == preferredParser)
            continue;

        date = tryParser(parser);
        if (date)
            return date;
    }

    return undefined;

    function tryParser(parse) {
        try {
            var date = parse(str);
            if (!isNaN(date.getTime()))
                return date;
        }
        catch (e) { }

        return undefined;
    }
}


})(jQuery);
