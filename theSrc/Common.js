///<reference path="../../SharedWebUi.d.ts" />
var JavaScriptItemDataSource;
(function (JavaScriptItemDataSource) {
    JavaScriptItemDataSource[JavaScriptItemDataSource["Table"] = 0] = "Table";
    JavaScriptItemDataSource[JavaScriptItemDataSource["CellLink"] = 1] = "CellLink";
})(JavaScriptItemDataSource || (JavaScriptItemDataSource = {}));
/** Helper functions for JavaScript items.
 *
 * No jQuery allowed.  (Only D3 is included for JavaScript items when embedded or rendered alone.)
 */
var JavaScriptItemHelper;
(function (JavaScriptItemHelper) {
    function makeDefinitionFactory(definition) {
        // Load the JavaScript that defines the item.
        var script = document.createElement('script');
        script.type = 'text/javascript';
        // we want to remove any sourceMappingURL lines, as they will not work as they're 
        // not at the same folder path as the page they're being written into, 
        // and wouldn't work anyway as their source offsets will be wrong
        script.text = definition.script.replace(/\n\/\/\# sourceMappingURL=.+/g, "");
        document.getElementsByTagName('head')[0].appendChild(script);
        // Construct the item factory.
        var factory_func_name = definition.typeName + 'Factory';
        var definition_factory_func = window[factory_func_name];
        if (!definition_factory_func)
            throw new Error('Factory definition was not found after loading script: ' + factory_func_name);
        var definition_factory = new definition_factory_func();
        return definition_factory;
    }
    JavaScriptItemHelper.makeDefinitionFactory = makeDefinitionFactory;
    /** Add a numeric suffix to a name e.g. 'name' => 'name [2]'
     *  If name already has a numeric suffix, increment the number,
     *  e.g. 'name [4]' will be updated to 'name [5]'.
     */
    function addNumericSuffix(name) {
        var suffix = / \[(\d+)\]$/.exec(name);
        if (suffix)
            name = name.substring(0, name.length - suffix[0].length) + ' [' + (parseInt(suffix[1]) + 1).toString() + ']';
        else
            name += ' [2]';
        return name;
    }
    JavaScriptItemHelper.addNumericSuffix = addNumericSuffix;
    /** JavaScript port of TextUtil.cs - see comments there. */
    function decimalsToShow(val, n_decimals) {
        if (isNaN(val) || !isFinite(val))
            return val.toString();
        var rounded_str = val.toFixed(n_decimals);
        if (n_decimals >= 1) {
            if (rounded_str[0] === '0' && rounded_str[1] === '.')
                return rounded_str.substring(1); // We don't want leading '0'
            if (rounded_str[0] === '-' && rounded_str[1] === '0' && rounded_str[2] === '.')
                return '-' + rounded_str.substring(2); // We don't want leading '0'
        }
        return rounded_str;
    }
    JavaScriptItemHelper.decimalsToShow = decimalsToShow;
    function coalesceNumberSetting(def, user) {
        return typeof user !== 'undefined' ? user : def;
    }
    JavaScriptItemHelper.coalesceNumberSetting = coalesceNumberSetting;
    function coalesceBooleanSetting(def, user) {
        return typeof user !== 'undefined' ? user : def;
    }
    JavaScriptItemHelper.coalesceBooleanSetting = coalesceBooleanSetting;
    /** Returns a new settings object with the settings overidding those of defaults. */
    function coalesceFontSettings(defaults, settings) {
        defaults = defaults || {};
        settings = settings || {};
        return {
            family: settings.family || defaults.family,
            size: settings.size !== undefined ? settings.size : defaults.size,
            bold: settings.bold !== undefined ? settings.bold : defaults.bold,
            italic: settings.italic !== undefined ? settings.italic : defaults.italic,
            underline: settings.underline !== undefined ? settings.underline : defaults.underline,
            strikeout: settings.strikeout !== undefined ? settings.strikeout : defaults.strikeout,
            color: settings.color || defaults.color
        };
    }
    JavaScriptItemHelper.coalesceFontSettings = coalesceFontSettings;
    function coalesceLineSettings(defaults, settings) {
        defaults = defaults || {};
        settings = settings || {};
        return {
            color: settings.color || defaults.color,
            transparency: settings.transparency === undefined ? defaults.transparency : settings.transparency,
            widthPx: settings.widthPx === undefined ? defaults.widthPx : settings.widthPx
        };
    }
    JavaScriptItemHelper.coalesceLineSettings = coalesceLineSettings;
    function coalesceFillSettings(defaults, settings) {
        defaults = defaults || {};
        settings = settings || {};
        return {
            color: settings.color || defaults.color,
            transparency: settings.transparency === undefined ? defaults.transparency : settings.transparency
        };
    }
    JavaScriptItemHelper.coalesceFillSettings = coalesceFillSettings;
    function coalesceLineFillSettings(defaults, settings) {
        defaults = defaults || {};
        settings = settings || {};
        return {
            fill: coalesceFillSettings(defaults.fill, settings.fill),
            line: coalesceLineSettings(defaults.line, settings.line)
        };
    }
    JavaScriptItemHelper.coalesceLineFillSettings = coalesceLineFillSettings;
    function coalesceTickSettings(defaults, settings) {
        defaults = defaults || {};
        settings = settings || {};
        return {
            numTicks: settings.numTicks === undefined ? defaults.numTicks : settings.numTicks,
            line: coalesceLineSettings(defaults.line, settings.line)
        };
    }
    JavaScriptItemHelper.coalesceTickSettings = coalesceTickSettings;
    function coalesceFillRulesSettings(defaults, settings) {
        defaults = defaults || {};
        settings = settings || {};
        var rules_to_copy = settings.rules ? settings.rules : defaults.rules;
        var rules = [];
        rules_to_copy.forEach(rule => {
            rules.push({
                fill: coalesceFillSettings(rule.fill, {}),
                from: rule.from,
                to: rule.to
            });
        });
        return {
            rules: rules
        };
    }
    JavaScriptItemHelper.coalesceFillRulesSettings = coalesceFillRulesSettings;
    /**
       Word wrap text (in a d3 selection containing an svg text node) to fit into specified width.
       If max_height is specified, text will be truncated to fit into the specified height.
       If the text is too large to fit, the text is truncated and an ellipsis is added.
       Returns true if the text fits into the specified bounds.

       source: http://bl.ocks.org/mbostock/7555321
       Simplifed and extended by Alan to add max height and ellipsis.
     */
    function wordWrap(svgTextSelection, width, max_height) {
        function addEllipsisIfRequired(tspan, width) {
            if (tspan.node().getComputedTextLength() > width) {
                addEllipsisToTspan(tspan, width);
                return true;
            }
            return false;
        }
        var wrapped = true;
        svgTextSelection.each(function () {
            var text = d3.select(this);
            var x = text.attr('x');
            var lines = text.text().split('\n').reverse();
            text.text(null);
            while (lines.length > 0) {
                var line_text = lines.pop();
                var words = splitByLineBreakOpportunity(line_text).reverse();
                var word;
                var lineHeight = "1em";
                var tspan = text.append("tspan").attr('x', x).attr("dy", lineHeight);
                var line = [];
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join('').trim());
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join('').trim());
                        if (addEllipsisIfRequired(tspan, width)) {
                            wrapped = false;
                            return false;
                        }
                        line = [word];
                        // Append a new line containing a single word.
                        var next_span = text.append("tspan").attr('x', x).attr("dy", lineHeight).text(word);
                        if (max_height && text.node().getBBox().height > max_height) {
                            next_span.remove();
                            addEllipsisToTspan(tspan, width);
                            wrapped = false;
                            return false;
                        }
                        if (addEllipsisIfRequired(next_span, width)) {
                            wrapped = false;
                            //return false;
                        }
                        tspan = next_span;
                    }
                }
            }
            return undefined;
        });
        return wrapped;
    }
    JavaScriptItemHelper.wordWrap = wordWrap;
    /** Split a string into words, whitespace and punctuation */
    function splitByLineBreakOpportunity(text) {
        var words = [];
        while (text.length > 0) {
            var p = lineBreakOpportunity(text);
            words.push(text.substr(0, p));
            text = text.substr(p);
        }
        return words;
    }
    JavaScriptItemHelper.splitByLineBreakOpportunity = splitByLineBreakOpportunity;
    /** Index of first line-break opportunity. Returns length of text if there is none. */
    function lineBreakOpportunity(text) {
        // TODO: Alan: More sophisticated analysis including
        // breaking after but not before specific chars,
        // not breaking after minus before a number: -23.5,
        // what to do with '.'
        // Find position of first punctuation character, or end of text if there is none.
        // Unicode punctuation chars supported are:
        // '\u1806' // mongolian todo hyphen
        // '\u2012' // figure dash
        // '\u2013' // en dash
        // '\u2014' // em dash
        // '\u2212' // minus sign
        // '\u301C' // wave dash
        // '\u3030' // wavy dash
        // '\u00AD' // soft hyphen
        // '\u058A' // armenian hyphen
        // '\u2010' // hyphen
        var p = text.search(/[ \t\u1806\u2012\u2013\u2014\u2212\u301C\u3030\u00AD\u058A\u2010\/\\,&+-]/);
        // No punctuation found, so split is at the end of the text.
        if (p === -1)
            return text.length;
        // If first character is punctuation, split after it.
        return (p === 0) ? 1 : p;
    }
    JavaScriptItemHelper.lineBreakOpportunity = lineBreakOpportunity;
    function splitIntoLines(text) {
        var lines = [];
        while (text.length > 0) {
            var p = nextLineBreak(text);
            lines.push(text.substr(0, p));
            text = text.substr(p);
        }
        return lines;
    }
    JavaScriptItemHelper.splitIntoLines = splitIntoLines;
    /** Index of first newline. Returns length of text if there is none. */
    function nextLineBreak(text) {
        var p = text.search(/\n/);
        // No punctuation found, so split is at the end of the text.
        if (p === -1)
            return text.length;
        // If first character is newline, split after it.
        return (p === 0) ? 1 : p;
    }
    JavaScriptItemHelper.nextLineBreak = nextLineBreak;
    /**
     * Add a tooltip to a specified element using jQuery.
     * Does nothing if jQuery is not defined.
     */
    function addTooltip(text, tip) {
        if (typeof $ !== 'undefined') {
            var jq = $(text);
            if (jq.simpleTip)
                jq.simpleTip({ content: tip });
        }
    }
    JavaScriptItemHelper.addTooltip = addTooltip;
    /** Add an ellipsis to a d3 selection containing a tspan. */
    function addEllipsisToTspan(tspan, width) {
        // If the single word is too long, add ellipsis.
        var text = tspan.text() + '...';
        tspan.text(text);
        // Keep removing characters from the end of the text until the text fits into the specified width
        // or only the ellipsis is left.
        while (text.length > 3 && tspan.node().getComputedTextLength() > width) {
            text = text.substring(0, text.length - 4) + '...';
            tspan.text(text);
        }
    }
    var StringUtils;
    (function (StringUtils) {
        /** Format a string replacing placeholders {0} ... {n} with corresponding args. */
        function format(textWithPlaceholders, ...args) {
            return textWithPlaceholders.replace(/{(\d+)}/g, function (match, number) {
                return typeof args[number] != 'undefined' ? args[number] : match;
            });
        }
        StringUtils.format = format;
        ;
    })(StringUtils = JavaScriptItemHelper.StringUtils || (JavaScriptItemHelper.StringUtils = {})); // module String
    /** Source: http://jsperf.com/svgellipsis
     *
     * Truncates the given SVG <text> element with ellipses so it fits into 'maxWidth'.
     *
     * If the text is truncated, a tooltip is added.
     */
    function svgTextEllipses(text_object, text_string, max_width) {
        if (!text_string) {
            text_object.textContent = '';
            return;
        }
        text_object.textContent = text_string;
        var str_length = text_string.length;
        var width = text_object.getSubStringLength(0, str_length);
        // ellipsis is needed
        if (width >= max_width) {
            text_object.textContent = '...' + text_string;
            str_length += 3;
            // guess truncate position
            var i = Math.floor(str_length * max_width / width) + 1;
            // refine by expansion if necessary
            while (++i < str_length && text_object.getSubStringLength(0, i) < max_width)
                ;
            // refine by reduction if necessary
            while (--i > 3 && text_object.getSubStringLength(0, i) > max_width)
                ;
            text_object.textContent = text_string.substring(0, i - 3) + '...';
            // show a title/tooltip of the full text
            addTooltip(text_object, text_string);
        }
    }
    JavaScriptItemHelper.svgTextEllipses = svgTextEllipses;
    /** Test if an array contains a specified value. */
    function contains(array, value) {
        return array.indexOf(value) != -1;
    }
    JavaScriptItemHelper.contains = contains;
    /** Return true if set1 contains every element that set2 contains */
    function isSubset(set1, set2) {
        for (var key in set1)
            if (set2.indexOf(set1[key]) === -1)
                return false;
        return true;
    }
    JavaScriptItemHelper.isSubset = isSubset;
    /** Intended as a base class for classes that implement IJavaScriptItem
     *  It does not inherit from IJavaScriptItem because it would result in unnecessary dummy methods.
     *  Typescript does not have abstract classes ... yet */
    class JavaScriptItemBase {
        constructor(guid) {
            this._id = guid;
        }
        getGuid() {
            return this._id;
        }
        /** Saves a callback to fire when the item wants to save its settings.
            These are serialized with the project and later supplied with 'setLastSettings()'. */
        setSaveSettingsCallback(callback) {
            this._saveSettingsToServer = callback;
        }
    }
    JavaScriptItemHelper.JavaScriptItemBase = JavaScriptItemBase;
})(JavaScriptItemHelper || (JavaScriptItemHelper = {}));
var Data;
(function (Data) {
    function formatStatistic(value, statistic, show_percentage = true, is_categorical_string = false) {
        var val_str;
        if (statistic.IsNumber) {
            val_str = statistic.HasDecimalPlaces ? JavaScriptItemHelper.decimalsToShow(value, statistic.DecimalPlaces) : value.toString();
            if (statistic.IsPercent && show_percentage)
                val_str += '%';
            else if (statistic.MoneySymbol)
                val_str = statistic.MoneySymbol + val_str;
        }
        else if (statistic.IsBoolean)
            val_str = value === null ? '' : (value ? '\u2714' : '\u2718'); // tick and cross to represent true and false.
        else if (statistic.IsCategorical)
            val_str = is_categorical_string ? value : statistic.Categories[value];
        else if (statistic.IsDateTime)
            val_str = formatDate(new Date(value));
        else
            val_str = value;
        return val_str;
    }
    Data.formatStatistic = formatStatistic;
    // e.g.: 2015/05/29 17:02:58.612
    function formatDate(date) {
        var year = date.getUTCFullYear();
        var month = date.getUTCMonth() + 1; // for some reason, this function returns months from 0 to 11
        var day = date.getUTCDate();
        var hours = date.getUTCHours();
        var minutes = date.getUTCMinutes();
        var seconds = date.getUTCSeconds();
        var milliseconds = date.getUTCMilliseconds();
        var str = year + '/';
        if (month < 10)
            str += '0';
        str += month + '/';
        if (day < 10)
            str += '0';
        str += day;
        if (hours !== 0 || minutes !== 0 || seconds !== 0 || milliseconds !== 0) {
            str += ' ';
            if (hours < 10)
                str += '0';
            str += hours + ':';
            if (minutes < 10)
                str += '0';
            str += minutes;
            if (seconds !== 0 || milliseconds !== 0) {
                str += ':';
                if (seconds < 10)
                    str += '0';
                str += seconds;
                if (milliseconds !== 0) {
                    str += '.';
                    if (milliseconds < 10)
                        str += '00';
                    else if (milliseconds < 100)
                        str += '0';
                    str += milliseconds;
                }
            }
        }
        return str;
    }
    Data.formatDate = formatDate;
    /** Multi-dimensional data cube */
    class Cube {
        constructor(data, dimensions, metaData) {
            this.data = data;
            this.dimensions = dimensions;
            this.metaData = metaData;
        }
        /** Look up a data point. */
        dataPoint(coords) {
            return this.data[this.indexOf(coords)];
        }
        /** Set the value of a data point*/
        setData(value, coords) {
            this.data[this.indexOf(coords)] = value;
        }
        /** Get the index of the data point with specified coordinates. */
        indexOf(coords) {
            return Cube.indexOf(coords, this.dimensions);
        }
        /** Coordinates of a point with specified flattened index in table */
        coordinates(index) {
            return Cube.coordinates(index, this.dimensions);
        }
        /** Loop over all data points.
         * The data point and its coordinates are supplied to the callback */
        forEachDataPoint(callback) {
            var dimensions = this.dimensions;
            var ndims = dimensions.length;
            for (var i = 0; i < this.data.length; i++) {
                callback(this.data[i], this.coordinates(i));
            }
        }
        /** Loop over all coordinates for points in the cube */
        static forEachPoint(dimensions, callback) {
            var ndims = dimensions.length;
            // Number of points is the product of the number of data dimensions.
            var npoints = dimensions.reduce((product, dimsize) => product * dimsize, 1);
            //debugger;
            // Initialize coords to [0, 0, ...]
            var coords = dimensions.map(() => 0);
            for (var i = 0; i < npoints; i++) {
                callback(coords.slice());
                // Update coordinates for next data point.                
                // Loop through coordinates incrementing and wrapping back to zero if required.
                for (var n = ndims - 1; n >= 0 && ++coords[n] === dimensions[n]; n--) {
                    coords[n] = 0;
                }
            }
        }
        /** Coordinates of a point with specified flattened position in cube */
        static coordinates(position, dimensions) {
            var coords = new Array(dimensions.length);
            for (var d = coords.length - 1; d >= 0; d--) {
                var count = dimensions[d];
                coords[d] = position % count;
                position /= count;
            }
            return coords;
        }
        /** Get the index of the data point with specified coordinates. */
        static indexOf(coords, dimensions) {
            assert(coords.length === dimensions.length);
            var index = 0;
            for (var i = 0; i < coords.length; i++) {
                index *= dimensions[i];
                index += coords[i];
            }
            return index;
        }
    }
    Data.Cube = Cube;
    /** Wrapper around ITable data structure to make extracting data easier */
    class TabularData {
        constructor(data) {
            this.Dimensions = data.Dimensions;
            this.DataPoints = data.DataPoints;
            this.Settings = data.Settings;
            var stat_dimension_index = -1;
            for (var n = 0; n < this.Dimensions.length; n++) {
                if (data.Dimensions[n].IsStatistic) {
                    stat_dimension_index = n;
                    break;
                }
            }
            this._statisticsDimensionIndex = stat_dimension_index;
            this.StatisticsDimension = data.Dimensions[stat_dimension_index];
            this.Statistics = this.StatisticsDimension.Elements;
            var data_dims = data.Dimensions.map(d => d); // Copy the array.
            data_dims.splice(stat_dimension_index, 1); // Remove the statistics dimension.
            this.CategoricalDimensions = data_dims;
            // Size of the table is the product of its dimensions.
            this.Size = data.Dimensions.reduce((product, dim) => product * dim.Count, 1);
            // Fix NaNs that have been converted to string "NaN".
            this._fixNaNs();
        }
        /** Get the StatisticElement defining the statistic with the specified ID.
          * Returns undefined if the statistic is not available. */
        getStatistic(id) {
            return this.Statistics.filter(stat => stat.Id == id)[0];
        }
        dataPoint(arg1, arg2) {
            return this._dataPoint(arg2 ? this.insertStatisticCoordinate(this.Statistics.map(elem => elem.Id).indexOf(arg1), arg2) : arg1);
        }
        /** Get the Name field for each coordinate (coords does not include statistic index).
          * The results are in the order they appear in the table. */
        Names(coords) {
            return coords.map((n, index) => this.CategoricalDimensions[index].Elements[n].Name);
        }
        /** Get the Id field for each coordinate (coords does not include statistic index).
          * The results are in the order they appear in the table. */
        Ids(coords) {
            return coords.map((n, index) => this.CategoricalDimensions[index].Elements[n].Id);
        }
        forEachDataPoint(arg1, arg2) {
            if (typeof arg1 === 'number') {
                var stat_index = arg1;
                var callback = arg2;
                this._loopOverOneStatistic(stat_index, callback);
            }
            else {
                var dims = this.Dimensions.map(d => d.Count);
                var callback = arg1;
                Cube.forEachPoint(dims, (coord) => callback(this._dataPoint(coord), coord));
            }
        }
        /** Return a map for inserting a statistic coordinate for a specified coordinate */
        coordinateMapForStatistic(statisticId) {
            var stat_index = this.Statistics.map(stat => stat.Id).indexOf(statisticId);
            if (stat_index === -1)
                return undefined;
            return (coords) => {
                // Copy coordinates so the caller does not get any nasty surprises.
                var coords = coords.slice();
                coords.splice(this._statisticsDimensionIndex, 0, stat_index);
                return coords;
            };
        }
        /** Insert the statistic coordinate for a data point */
        insertStatisticCoordinate(statisticIndex, dataCoords) {
            // Copy coordinates so the caller does not get any nasty surprises.
            var coords = dataCoords.slice();
            coords.splice(this._statisticsDimensionIndex, 0, statisticIndex);
            return coords;
        }
        //section(selection: number[][]): TabularData {
        //    //debugger;
        //    // Pull out selected indices from Dimensions
        //    var dimensions: Dimension[] = selection.map((selected_indices, index) => {
        //        var dimension = this.Dimensions[index];
        //        var elements = TabularData._select(dimension.Elements, selected_indices);
        //        return {
        //            Id: dimension.Id,
        //            Name: dimension.Name,
        //            Tiers: [],
        //            Count: elements.length,
        //            IsStatistic: dimension.IsStatistic,
        //            Elements: elements
        //        };
        //    });
        //    // TODO: Aan: figure out what to do with settings for tables that aren't 2D.
        //    //assert(this.DataDimensions.length === 2);
        //    //var settings: TabularSettings = {
        //    //    CellDimensionId: this.Settings.CellDimensionId,
        //    //    RowDimensionsIds: [],
        //    //    ColumnDimensionsIds: [],
        //    //    ColumnHeadersHidden: this.Settings.ColumnHeadersHidden,
        //    //    Footnote: this.Settings.Footnote,
        //    //    RowHeaderSorts: [],
        //    //    ColumnHeaderSorts: [],
        //    //    PaginationParameters: this.Settings.PaginationParameters
        //    //};
        //    var dims = dimensions.map(d => d.Count)
        //    // Allocate new data storage compatible with new dimensions.
        //    var data = TabularData._allocateDataStorage(dims);
        //    Cube.forEachPoint(dims, coords => {
        //        var stat_dim_index = this._statisticsDimensionIndex;
        //        if (stat_dim_index !== 0) {
        //            var stat_coord = coords.shift();
        //            coords.splice(stat_dim_index, 0, stat_coord);
        //        }
        //        // Remove the last coordinate to access the array that contains the data points.
        //        var array_coords = coords.slice(0, dimensions.length - 1);
        //        var last_dimension_array = <DataPoint[]> array_coords.reduce((d: any, n: number) => d == null ? null : d[n], data);
        //        last_dimension_array[coords[coords.length - 1]] = this.dataPoint(coords);
        //    });
        //    return new TabularData({ Dimensions: dimensions, DataPoints: data, Settings: null });
        //}
        /** Get a data point at the specified coordinates. */
        _dataPoint(coords) {
            return coords.reduce((d, n) => d == null ? null : d[n], this.DataPoints);
        }
        /** Loop over all points for a specified statistic. Coordinates do not include the statstics coordinate. */
        _loopOverOneStatistic(stat_index, callback) {
            var stat_dim_index = this._statisticsDimensionIndex;
            var dims = this.CategoricalDimensions.map(d => d.Count);
            Cube.forEachPoint(dims, (coords) => {
                callback(this._dataPoint(this.insertStatisticCoordinate(stat_index, coords)), coords);
            });
        }
        /** Since rev 22099, the Newtonsoft parser now encodes NaNs as the string "NaN".
         * so convert any DataPoint values that contain "NaN" strings to NaN values. */
        _fixNaNs() {
            var n = this.Statistics.length;
            for (var i = 0; i < n; ++i) {
                if (this.Statistics[i].IsNumber)
                    this.forEachDataPoint(i, d => { if (d.Value === "NaN")
                        d.Value = NaN; });
            }
        }
        /** Allocate a multi-dimensional array with specified dimensions.
          * Size of last dimension is ignored and an empty array is allocated for each last dimension. */
        static _allocateDataStorage(dimensions) {
            var size = dimensions[0];
            // If this is the last dimension, return an empty array, ignoring the size.
            if (dimensions.length == 1)
                return [];
            dimensions = dimensions.slice(1);
            var data = [];
            for (var i = 0; i < size; ++i)
                data.push(TabularData._allocateDataStorage(dimensions));
            return data;
        }
        static _select(array, selection) {
            return selection.map(n => array[n]);
        }
    }
    Data.TabularData = TabularData;
    /** Convert a one dimensional table into a two dimensional table with one column.
     * Tiers are ignored. */
    function makeOneColumnTable(table, dimensionId, name, columnId, columnLabel) {
        assert(table.CategoricalDimensions.length === 1);
        var columnElement = { Id: columnId, Name: columnLabel };
        var row = table.CategoricalDimensions[0];
        var col = { Id: dimensionId, Name: name, Tiers: [], Count: 1, IsStatistic: false, Elements: [columnElement] };
        var dimensions = [table.Dimensions[0], row, col];
        var data = (table.DataPoints).map(dim => dim.map((p) => [p])); // put each value into a separate row.
        return new TabularData({ Dimensions: dimensions, DataPoints: data, Settings: table.Settings });
    }
    Data.makeOneColumnTable = makeOneColumnTable;
    /** Convert a one dimensional table into a two dimensional table with one row.
     * Tiers are ignored. */
    function makeOneRowTable(table, tableId, name, rowId, rowLabel) {
        assert(table.CategoricalDimensions.length === 1);
        var rowElement = { Id: rowId, Name: rowLabel };
        var row = { Id: tableId, Name: name, Tiers: [], Count: 1, IsStatistic: false, Elements: [rowElement] };
        var col = table.CategoricalDimensions[0];
        var dimensions = [table.StatisticsDimension, row, col];
        var data = (table.DataPoints).map(dim => [dim]); // for each statistic, create a one row table.
        return new TabularData({ Dimensions: dimensions, DataPoints: data, Settings: table.Settings });
    }
    Data.makeOneRowTable = makeOneRowTable;
})(Data || (Data = {})); // Module Data
var Geometry2D;
(function (Geometry2D) {
    /** Two dimensional point. */
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }
    Geometry2D.Point = Point;
    /** Rectangle with sides parallel to coordinate axes */
    class Rectangle {
        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
        centre() { return new Point(this.x + this.width / 2, this.y + this.height / 2); }
    }
    Geometry2D.Rectangle = Rectangle;
})(Geometry2D || (Geometry2D = {}));
var SVG;
(function (SVG) {
    /** Generate the SVG string for a path. NOTE: coordinates are rounded to integers. */
    function renderPath(points, close = false) {
        // Move to the first point.
        var path = "M" + points[0].x.toFixed(0) + " " + points[0].y.toFixed(0);
        // Generate line segments for subsequent points.
        for (var i = 1; i < points.length; i++) {
            path += " L" + points[i].x.toFixed(0) + " " + points[i].y.toFixed(0);
        }
        if (close) {
            // Close the path.
            path += " Z";
        }
        return path;
    }
    SVG.renderPath = renderPath;
    /** Font settings that apply to SVG text elements */
    class FontStyle {
        /** Converts a JavaScript item's font setting into SVG font attributes.  See QGaugeChart */
        constructor(font) {
            var decoration = '';
            if (font.underline)
                decoration += 'underline';
            if (font.strikeout)
                decoration += (decoration.length ? ' ' : '') + 'line-through';
            this.fontSizePts = font.size;
            this.fontFamily = font.family;
            this.fontColor = font.color;
            if (decoration)
                this.textDecoration = decoration;
            if (font.italic != null)
                this.fontStyle = font.italic ? 'italic' : 'normal';
            if (font.bold != null)
                this.fontWeight = font.bold ? 'bold' : 'normal';
        }
        applyTo(text) {
            var fontSize = this.fontSizePts ? this.fontSizePts + 'pt' : undefined;
            text.attr('text-decoration', this.textDecoration) // underline / line-through
                .style('fill', this.fontColor)
                .style('font-family', this.fontFamily)
                .style('font-style', this.fontStyle) // normal / italic
                .style('font-weight', this.fontWeight) // normal / bold
                .style('font-size', fontSize);
        }
    }
    SVG.FontStyle = FontStyle;
})(SVG || (SVG = {}));
/** Reusable code for working with settings for AnalysisJavaScript items. */
var Settings;
(function (Settings) {
    /** Bidirectional map between ids and names */
    class NameMap {
        constructor(arg1, names) {
            this.names = [];
            this.nameToId = {};
            this.idToName = {};
            if (names)
                this._constructFromArrays(arg1, names);
            else
                this._constructFromDictionary(arg1);
        }
        _constructFromMap(ids, map) {
            this.names = ids.map(id => map(id));
            ids.forEach(id => {
                this.nameToId[name] = id;
                this.idToName[id] = name;
            });
        }
        _constructFromDictionary(dictionary) {
            this.idToName = dictionary;
            for (var id in dictionary) {
                var name = dictionary[id];
                this.nameToId[name] = id;
                this.names.push(name);
            }
        }
        _constructFromArrays(ids, names) {
            this.names = names;
            for (var i = 0; i < names.length; i++) {
                var id = ids[i];
                var name = names[i];
                this.nameToId[name] = id;
                this.idToName[id] = name;
            }
        }
    }
    Settings.NameMap = NameMap;
    class Binding {
        constructor(settings, name) {
            this.getValue = () => { return settings()[name]; };
            this.setValue = (newSettings) => { settings()[name] = newSettings; };
        }
    }
    Settings.Binding = Binding;
    /** Binding to a value that depends on context */
    class DynamicBinding {
        constructor(group) {
            this._group = group;
        }
        setValue(value) { this.getBinding(this._group.getSelectedContext()).setValue(value); }
        getValue() { return this.getBinding(this._group.getSelectedContext()).getValue(); }
    }
    Settings.DynamicBinding = DynamicBinding;
    class Setting {
        constructor(getDefault, binding) {
            /** Called after setValue is called. */
            this.onSettingsChanged = () => { };
            this.getDefault = getDefault;
            this.binding = binding;
        }
        getValue() {
            var default_value = this.getDefault();
            var value = this.binding.getValue();
            return this.coalesce(default_value, value);
        }
        setValue(value) {
            var default_value = this.getDefault();
            var delta = this.difference(default_value, value);
            var old_value = this.binding.getValue();
            var changed = !equal(delta, old_value);
            if (changed) {
                this.binding.setValue(delta);
                this.onSettingsChanged();
            }
        }
        /** Combine default settings with an override
          * to produce a final value of the setting(s).
          * Must satisfy value === coalesce(default_value, difference(default_value, value)).
          * Default implementation returns the default if value is not defined. */
        coalesce(default_value, value) {
            return value === undefined ? default_value : value;
        }
        /** Compare default_value with value and return the difference between the two.
          * value must completely specify the setting.
          * difference may return undefined if the value is equivalent to the default.
          * For any setting value, this function must satisfy
          * equal(coalesce(default_value, value), coalesce(default_value, difference(default_value, value))). */
        difference(defaultValue, value) {
            //return (value === defaultValue) ? undefined : value;
            return diff(defaultValue, value);
        }
    }
    Settings.Setting = Setting;
    /** Recursively compare two JavaScript values for equality.
      * Two objects or arrays are equal if their enumerable properties have equal values.
      * Two functions are equal if they are the same function. */
    function equal(value1, value2) {
        var type1 = typeof value1;
        var type2 = typeof value2;
        if (type1 != type2)
            return false;
        if ((type1 !== 'object') || (value1 === null) || (value2 === null))
            return value1 === value2;
        var diff_key_count = 0;
        // count keys
        for (var key in value1)
            ++diff_key_count;
        // subtract count of keys
        for (var key in value2)
            --diff_key_count;
        if (diff_key_count !== 0)
            return false;
        for (var key in value1) {
            if (!equal(value1[key], value2[key]))
                return false;
        }
        return true;
    }
    Settings.equal = equal;
    /** Calculate the difference between a default value and an overridden value.
      * If the overridden value is undefined or is equal to (or contained in) the default,
      * undefined is returned. */
    function diff(defaultValue, changedValue) {
        if (changedValue === undefined)
            return undefined;
        var default_value_type = typeof defaultValue;
        if (default_value_type === 'undefined')
            return changedValue;
        if (default_value_type !== 'object')
            return changedValue === defaultValue ? undefined : changedValue;
        var changed = {};
        var num_changed = 0;
        for (var key in changedValue) {
            if (!equal(defaultValue[key], changedValue[key])) {
                var delta = diff(defaultValue[key], changedValue[key]);
                if (delta !== undefined) {
                    changed[key] = delta;
                    ++num_changed;
                }
            }
        }
        return num_changed > 0 ? changed : undefined;
    }
    Settings.diff = diff;
    /** Calculate the difference between a default value and an overridden value.
      * If the overridden value is undefined or is equal to (or contained in) the default,
      * undefined is returned. */
    function coalesce(defaultValue, changedValue) {
        if (changedValue === undefined)
            return defaultValue;
        if (defaultValue === undefined)
            return changedValue;
        var default_value_type = typeof defaultValue;
        if (default_value_type !== 'object')
            return changedValue;
        var changed = {};
        for (var key in defaultValue) {
            var value = coalesce(defaultValue[key], changedValue[key]);
            if (value !== undefined)
                changed[key] = value;
        }
        for (var key in changedValue) {
            var value = coalesce(defaultValue[key], changedValue[key]);
            if (value !== undefined)
                changed[key] = value;
        }
        return changed;
    }
    Settings.coalesce = coalesce;
    class FontSetting extends Setting {
        coalesce(default_value, value) {
            return JavaScriptItemHelper.coalesceFontSettings(default_value, value);
        }
        difference(default_value, value) {
            return diff(default_value, value);
        }
    }
    Settings.FontSetting = FontSetting;
    /** Class for managing a font setting with dynamic context. */
    class DynamicFontSetting extends DynamicBinding {
        constructor(group, global, dynamic) {
            super(group);
            this.onSettingsChanged = () => { };
            this.getBinding = (contextTitle) => {
                if (this._group.hasGlobalContextSelected())
                    return this._global;
                var binding = new FontSetting(() => this._global.getValue(), this._override.getBinding(contextTitle));
                binding.onSettingsChanged = () => { this.onSettingsChanged(); };
                return binding;
            };
            global.onSettingsChanged = () => { this.onSettingsChanged(); };
            this._global = global;
            this._override = dynamic;
        }
    }
    Settings.DynamicFontSetting = DynamicFontSetting;
    class FillSettings extends Setting {
        coalesce(defaultValue, value) {
            return JavaScriptItemHelper.coalesceFillSettings(defaultValue, value);
        }
        difference(defaultValue, value) {
            defaultValue = defaultValue || {};
            value = value || {};
            if (JSON.stringify(defaultValue) === JSON.stringify(value))
                return undefined;
            var diff = value;
            diff.color = value.color === defaultValue.color ? undefined : value.color;
            diff.transparency = value.transparency === defaultValue.transparency ? undefined : value.transparency;
            return diff;
        }
    }
    Settings.FillSettings = FillSettings;
})(Settings || (Settings = {})); // Module Settings
/** Classes for managing ObjectInspector Controls */
var Controls;
(function (Controls) {
    ;
    class Inspector {
        constructor(inspector) {
            this._inspector = inspector;
        }
        addPage(title) {
            return new Page(this._inspector, title);
        }
        removePage(page) {
            this._inspector.removePage(page._page);
        }
    }
    Controls.Inspector = Inspector;
    /** Thin wapper on ObjectInspectorPage to simplify interaction */
    class Page {
        constructor(inspector, title) {
            this._groups = [];
            this._page = inspector.createPage(title);
        }
        addGroup(title, dynamic = false) {
            var group = new Group(this._page, title, dynamic);
            this._groups.push(group);
            return group;
        }
        show() { this._page.parent.showPage(this._page); }
        refreshControls() { this._groups.forEach(group => group.refreshControls()); }
    }
    Controls.Page = Page;
    /** Thin wrapper around ObjectInspectorPageGroup that adds functionality from JavaScriptItemHelper */
    class Group {
        constructor(page, title, dynamic) {
            /** Controls in this group */
            this._controls = [];
            // TODO: Should this have a different value to the label, to avoid confusion?
            this._globalContextId = "All";
            this.getDynamicContextLabels = () => { return [this._globalContextId]; };
            var group = page.addGroup(title);
            // TODO: Alan: deal with multiple contexts in static mode.
            // Currently each group in static mode has exactly one context.
            this._context = dynamic ?
                group.setDynamicMode(this._globalContextId, () => { this.onContextSelected(); })
                : group.addContext(this._globalContextId);
            this._group = group;
        }
        getObjectInspectorContext(contextId) {
            // TODO: Alan:  fix this to deal with multiple contexts for one group.
            return this._group.selectedContext;
        }
        add(control, contextId) {
            this._controls.push(control);
            control.parent = this;
            control.addToGroup(this);
            control.contextId = contextId ? contextId : this._globalContextId;
        }
        /** Currently selected context */
        getSelectedContext() {
            //debugger;
            return this._group.selectedContext.title;
        }
        hasGlobalContextSelected() {
            return this._group.selectedContext.title === this._globalContextId;
        }
        /** Called when dynamic context is changed. */
        onContextSelected() {
            this.refreshControls();
        }
        /** Copy settings from model to object inspector controls */
        refreshControls() {
            if (this._group.mode == ObjectInspectorContextMode.Dynamic)
                this.setDynamicContexts(this.getDynamicContextLabels());
            this._controls.forEach(controls => {
                controls.refresh();
            });
        }
        /** Set strings to display for dynamic contexts. */
        setDynamicContexts(titles) {
            this._group.setDynamicContexts(titles);
        }
    }
    Controls.Group = Group;
    class ControlBase {
        /** Called when the controls are added to the group. */
        addToGroup(group) { }
        /** Refresh controls by fetching state from item. */
        refresh() { }
    }
    Controls.ControlBase = ControlBase;
    /** Base class for controls */
    class Control extends ControlBase {
        constructor(binding) {
            super();
            /** Called by refresh before refreshing values
              * override this for custom actions. */
            this.onRefresh = () => { };
            this.binding = binding;
        }
        onChanged(settings) {
            this.binding.setValue(settings);
        }
        /** Called to update value from settings. */
        refresh() {
            this.onRefresh();
        }
    }
    Controls.Control = Control;
    class UpDown extends Control {
        constructor(id, label, tooltip, binding) {
            super(binding);
            this.min = 0;
            this.max = 999999;
            this.decimalPlaces = 0;
            this.id = id;
            this.label = label;
            this.tooltip = tooltip;
            this.enabled = true;
        }
        addToGroup(parent) {
            var context = parent.getObjectInspectorContext(this.contextId);
            var control = new RibbonUpDown(this.id, this.label, this.tooltip, () => {
                this.binding.setValue(control.value());
            });
            control.addToDialog(context.addRow(), null);
            this._control = control;
        }
        refresh() {
            this.onRefresh();
            this._control.min(this.min);
            this._control.max(this.max);
            this._control.decimalPlaces(this.decimalPlaces);
            this._control.enabled(this.enabled);
            this._control.value(this.binding.getValue());
        }
    }
    Controls.UpDown = UpDown;
    class ColourControl extends Control {
        constructor(id, label, tooltip, binding) {
            super(binding);
            this.id = id;
            this.label = label;
            this.tooltip = tooltip;
            this.enabled = true;
        }
        addToGroup(parent) {
            var context = parent.getObjectInspectorContext(this.contextId);
            var colour_control = new RibbonPopupColor(this.id, this.label, this.tooltip, 'medium', Util.makeSharedWebUiSpriteImg('colourfill.png'), () => {
                this.binding.setValue(colour_control.value());
            }, null, Translate('More Colors...'));
            colour_control.addToDialog(context.addRow(), null);
            this._control = colour_control;
        }
        refresh() {
            this.onRefresh();
            this._control.enabled(this.enabled);
            this._control.color(this.binding.getValue());
        }
    }
    Controls.ColourControl = ColourControl;
    class FontControls extends Control {
        constructor(id, label, binding, zoom) {
            super(binding);
            this.id = id;
            this.label = label;
            this.zoom = zoom;
            this.enabled = true;
        }
        addToGroup(group) {
            var context = group.getObjectInspectorContext(this.contextId);
            var on_changed = (settings) => {
                this.onChanged(settings);
            };
            this._fontControls = ObjectInspectorHelper.addFontControls(this.id, this.label, context, on_changed, this.zoom);
        }
        refresh() {
            this.onRefresh();
            this._fontControls.enabled(this.enabled);
            this._fontControls.updateControls(this.binding.getValue());
        }
    }
    Controls.FontControls = FontControls;
    class CheckBox extends Control {
        constructor(id, label, tooltip, binding, checkAlign = 'left') {
            super(binding);
            this.enabled = true;
            this.name = id;
            this.label = label;
            this.checkAlign = checkAlign;
        }
        addToGroup(group) {
            var context = group.getObjectInspectorContext(this.contextId);
            this._checkbox = new RibbonCheckBox(this.name, this.label, this.tooltip, this.checkAlign, () => { this.onChanged(this._checkbox.checked()); });
            this._checkbox.addToDialog(context.addRow(), null);
            this._checkbox.enabled(this.enabled);
        }
        refresh() {
            this.onRefresh();
            this._checkbox.checked(this.binding.getValue());
            this._checkbox.enabled(this.enabled);
        }
    }
    Controls.CheckBox = CheckBox;
    class ComboBox extends Control {
        constructor(id, label, tooltip, binding, getLabels) {
            super(binding);
            this.name = id;
            this.label = label;
            this.tooltip = tooltip;
            this.getLabels = getLabels;
        }
        addToGroup(group) {
            var context = group.getObjectInspectorContext(this.contextId);
            var combo_box = new RibbonComboBox(this.name, this.label, this.tooltip, false, () => { this.onChanged(this._comboBox.value()); });
            combo_box.addToDialog(context.addRow().addClass('oi-single-combobox-row'), null);
            this._comboBox = combo_box;
        }
        refresh() {
            this.onRefresh();
            var labels = this.getLabels();
            var combo_box = this._comboBox;
            combo_box.populateList(labels, false);
            var enabled = labels.length > 0;
            combo_box.enabled(enabled);
            var value = enabled ? this.binding.getValue() : '';
            combo_box.value(value || '');
        }
    }
    Controls.ComboBox = ComboBox;
    /** Specialized Net Sum Combo box that handles translation of values */
    class MappedComboBoxControl extends ComboBox {
        constructor(name, label, tooltip, getNameMap, binding) {
            // Wrap another binding around the first one
            // to map between ids and displayed names.
            super(name, label, tooltip, {
                getValue: () => getNameMap().idToName[binding.getValue()],
                setValue: (value_name) => binding.setValue(getNameMap().nameToId[value_name])
            }, () => getNameMap().names);
        }
    }
    Controls.MappedComboBoxControl = MappedComboBoxControl;
    /** Specialized Net Sum Combo box that handles translation of values */
    class NetSumControl extends MappedComboBoxControl {
        constructor(name, label, tooltip, binding) {
            var selections = [Translate('Include'), Translate('Exclude'), Translate('Exclude all duplicate categories')];
            var keys = ['Include', 'Exclude', 'ExcludeAllDuplicateCategories'];
            var map = new Settings.NameMap(keys, selections);
            super(name, label, tooltip, () => map, binding);
        }
    }
    Controls.NetSumControl = NetSumControl;
})(Controls || (Controls = {}));
