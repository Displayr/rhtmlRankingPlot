///<reference path="../../SharedWebUi.d.ts" />

/** 
 * This factory describes static things about ranking plots,
 * and is called to create new ranking plot instances.
 */
class QRankingPlotFactory implements IJavaScriptItemFactory {
    typeName() {
        return 'QRankingPlot';
    }
    typeDisplayName() {
        return Translate('Ranking Plot');
    }
    dataSource() {
        return JavaScriptItemDataSource.Table;
    }
    newItem(guid: string) {
        return new RankingPlot.QRankingPlot(guid);
    }
}

module RankingPlot {
    import wordWrap = JavaScriptItemHelper.wordWrap;

    import Point = Geometry2D.Point;
    import Rectangle = Geometry2D.Rectangle;

    /** Use format(text, args) instead of String.format,
     *  because String.format may not be available in the rendering environment. */
    import format = JavaScriptItemHelper.StringUtils.format;

    import ITabularData = QServerRequestsCommon.ITabularData;
    import TabularData = Data.TabularData;
    import StatisticElement = QServerRequestsCommon.StatisticElement;
    import DataPoint = QServerRequestsCommon.DataPoint;
    import contains = JavaScriptItemHelper.contains;
    import isSubset = JavaScriptItemHelper.isSubset;
    import JavaScriptItemBase = JavaScriptItemHelper.JavaScriptItemBase;

    /**
     * Word wrap text and add ellipsis if text does not fit into specified bounds.
     * If text does not fit, add a tooltip showing the full text.
     * Returns false if the text does not fit into the specified with and height.
     */
    function wrapWithTooltip(textSelection: D3.Selection, width: number, max_height?: number): boolean {
        var text = textSelection.text();
        var wrapped = wordWrap(textSelection, width, max_height);
        if (!wrapped)
            JavaScriptItemHelper.addTooltip(textSelection.node(), text);

        return wrapped;
    }

    /**
     * All our settings.  Saved with the project and given back to us when we load.
     * TypeScript 1.4: this does not need to be marked as 'export'
     */
    export interface IRankingPlotSettings extends IServerUnderstoodJavaScriptItemSettings {
        /** ID of statistic to use for ranking */
        rankingStatistic?: string;

        /** ID of statistic to display */
        displayValueId?: string;

        /** Set showValues to 'below' or 'right' to show values on the plot. Default value is 'no' */
        showValues?: string;

        /** Minimum value of ranking statistic to use when ranking. Smaller values will be ignored. */
        minValue?: number;
        
        /** Maximum number of ranks to show per column */
        maxRanks?: number;

        /** Default colours for flows: used to calculate the mapping from ranks to flow labels. */
        colours?: string[];

        /** Dictionary of flow colours indexed by flow IDs */
        colourMap?: { [flowId:string]: string };

        /** Colour for plot background */
        backgroundColour?: string;

        // LABEL Styles

        /** show labels on x and y y axes */
        showAxisLabels?: boolean;
        /** Font for axis labels */
        axisLabelFont?: IFontSettings;

        /** Show sample size range of each column in the column label. */
        showColumnN?: boolean;

        /** Font for column labels */
        columnLabelFont?: IFontSettings;
        /** per column overrides */
        columnLabelFontOverrides?: { [columnId: string]: IFontSettings; };

        /** Font for rank numbers on left hand side. */
        numberLabelFont?: IFontSettings;

        /** Font for flows. */
        flowLabelFont?: IFontSettings;
        /** Overrides for individual items. */
        flowLabelFontOverrides?: { [columnId: string]: IFontSettings; };

        perContext;
    }

    /**
     * One of these is created for each ranking plot item in the report tree (web-Q),
     * or embedded item, or with a single selection in Q (standalone).
     */
    export class QRankingPlot extends JavaScriptItemBase implements IJavaScriptItem {
        private _settings: IRankingPlotSettings;
        private _element: HTMLElement;
        private _tabular: TabularData;
        private _errors: string[];
        private _lastRankings: Ranking[];

        // Object inspector.
        private _inspector: Controls.Inspector;
        private _isEditMode: boolean;
        private _settingsPage: Controls.Page;

        private _doNotAnimateFlag: boolean;
        /** Record the default settings we use when rendering, so we can
         * wipe them out if the user reverts back.  This avoids persisting
         * default settings, which is good because it allows data to change
         * the defaults to update. */
        private _defaultSettings: IRankingPlotSettings;
        /** Whether we need to re-render.
         * We check the setters of settings and data to avoid this unless necessary,
         * in particular because when we save our settings, we may get a feedback loop. */
        private _dirty: boolean;
        // Contexts for columns and flows for ObjectInspectors.
        private _columnContexts: Settings.INameMap;
        private _flowContexts: Settings.INameMap;

        private _all: string = Translate('All');

        // Callback to update the object inspector control for minimum value for ranking static.
        // This is used to update the control when the ranking statistic is changed.
        private _updateMinValueControl: (stat: StatisticElement, value: number) => void;

        private _showValuesNameMap = new Settings.NameMap(['no', 'below', 'right'], [Translate('No'), Translate('Yes - Below'), Translate('Yes - Right')]);

        constructor(guid: string) {
            super(guid);

            this._defaultSettings = {
                showAxisLabels: false,
                showColumnN: false,
                showValues: 'no',
                maxRanks: 10,
                backgroundColour: '#FFFFFF',
                colours: [],
                axisLabelFont: {
                    size: 12
                },
                columnLabelFont: {
                    size: 11.11
                },
                flowLabelFont: {
                    size: 11.11
                },
                numberLabelFont: {
                    size: 12
                },
                perContext: {}
            };
            this._settings = <IRankingPlotSettings>({}); // too much hassle to deal with undefined
            this._dirty = true;
        }

        setObjectInspector(inspector: ObjectInspector) {
            this._inspector = new Controls.Inspector(inspector);
        }

        setLastSettings(settings: IRankingPlotSettings) {
            console.log('setLastSettings');
            if (Settings.equal(this._settings, settings))
                return;
            this._settings = settings;

            // Most commonly used statistics are non-negative, so 0 seems reasonable for a default minimum.
            this._defaultSettings.minValue = 0;

            // Update defaults from server.

            this._defaultSettings.colours = this._settings.serverDefaults.colors;
            var default_font = this._settings.serverDefaults.font;
            this._defaultSettings.axisLabelFont = default_font;
            this._defaultSettings.columnLabelFont = default_font;
            this._defaultSettings.numberLabelFont = default_font;
            // Copy font settings and override the default colour for item category labels.
            var flow_label_font: IFontSettings = JSON.parse(JSON.stringify(default_font));
            flow_label_font.color = "#ffffff";

            this._defaultSettings.flowLabelFont = flow_label_font;
            this._defaultSettings.rowNetSum = this._settings.serverDefaults.rowNetSum;
            this._defaultSettings.colNetSum = this._settings.serverDefaults.colNetSum;

            this._dirty = true;
            console.log('SETTINGS DIRTY');
        }

        setElement(element: HTMLElement) {
            if (this._element !== element) {
                this._element = element;
                this._dirty = true;
                console.log('ELEMENT DIRTY');
            }
        }

        setErrors(errors: string[]) {
            this._errors = errors;
            this._tabular = null;
            this._dirty = true;
            console.log('ERRORS DIRTY');
        }

        setTableData(tabular: TabularData): boolean {
            console.log('setTableData');
            var resize = false;
            if (tabular.CategoricalDimensions.length === 1)
                tabular = Data.makeOneColumnTable(tabular, 'dim0', tabular.CategoricalDimensions[0].Name, 'col0', tabular.CategoricalDimensions[0].Name);
            if (this._tabular) {
                // If data has not changed, there is nothing to do.
                if (Settings.equal(this._tabular, tabular))
                    return false;

                // Only resize if question(s) changed.
                var question_changed = (tabular.CategoricalDimensions[0].Id != this._tabular.CategoricalDimensions[0].Id
                    || tabular.CategoricalDimensions[1].Id != this._tabular.CategoricalDimensions[1].Id);
                var old_columns = this._tabular.CategoricalDimensions[1].Elements.map(element => element.Id);
                var new_columns = tabular.CategoricalDimensions[1].Elements.map(element => element.Id);
                // If columns have changed, set _lastRankings to null to prevent animation.
                if (question_changed || !Settings.equal(old_columns, new_columns))
                    this._lastRankings = null;
                resize = question_changed;
            }
            this._errors = null;
            this._tabular = tabular;

            // Select a statistic to show based on available data.
            // If a statistic is already selected and it is available, then it will be used.
            this._settings.rankingStatistic = this._selectRankingStatisticId(tabular.Statistics);

            var display_stat_setting = this._getDisplayValueBinding();
            var display_stat = tabular.getStatistic(display_stat_setting.getValue());
            if (!display_stat && this._settings.rankingStatistic)
                display_stat_setting.setValue(this._settings.rankingStatistic);

            // Update contexts to reflect new data.
            this._updateSettingsContexts();
            // Invalidate default colourMap because it is data specific.
            this._defaultSettings.colourMap = undefined;
            this._dirty = true;
            console.log('DATA DIRTY');
            return resize;
        }

        enterEditMode() {
            console.log('enterEditMode');
            this._isEditMode = true;

            // Re-render so that the ribbon controls are updated to reflect the given context.
            var any_context_selected = () => {
                this._dirty = true;
                this.render();
            };

            // The CHART page contains the most relevant settings for when the user starts editing a ranking plot.
            var page = this._inspector.addPage(Translate('Chart'));
            this._settingsPage = page;

            // AXIS LABELS
            var group = page.addGroup(Translate('Axis Labels'), false);
            var axis_labels_enabled_binding = this._getSetting<boolean>('showAxisLabels');
            var check_box = new Controls.CheckBox('axisLabelCheckbox', Translate('Show labels on axes'), Translate('Label axes with question names'), axis_labels_enabled_binding);
            group.add(check_box);
            var axis_label_font_controls = new Controls.FontControls('axisLabelFont', Translate('Font:'), this._getFontBinding('axisLabelFont'), false);
            axis_label_font_controls.enabled = false;
            group.add(axis_label_font_controls);
            // Update binding to enable or disable the font controls.
            check_box.binding = {
                setValue: (value: boolean) => {
                    axis_labels_enabled_binding.setValue(value);
                    axis_label_font_controls.enabled = value;
                    axis_label_font_controls.refresh();
                },
                getValue: () => axis_labels_enabled_binding.getValue()
            };

            // BACKGROUND
            var group = page.addGroup(Translate('Background'), false);
            group.add(new Controls.ColourControl('backgroundColourControl', Translate('Color'), Translate('Select color for background'), this._getSetting<string>('backgroundColour')));

            // COLUMN LABELS
            var group = page.addGroup(Translate('Column Labels'), true);
            group.getDynamicContextLabels = () => { return this._getAllContexts('columnLabelFont').names; };
            var font_controls = new Controls.FontControls('columnLabelFont', Translate('Font:'), this._getDynamicFontBinding(group, 'columnLabelFont'), false);
            group.add(font_controls);
            var show_column_n_binding = this._getSetting<boolean>('showColumnN');
            show_column_n_binding.onSettingsChanged = () => {
                this._updateRequiredStatistics();
                this._onAfterSettingsChanged();
            }
            var show_column_n_check_box = new Controls.CheckBox('showColumnNCheckbox', Translate('Show sample size'), Translate('Show range of sample sizes for each column'), show_column_n_binding);
            show_column_n_check_box.enabled = false;
            show_column_n_check_box.onRefresh = () => {
                show_column_n_check_box.enabled = false;
                // There is a bug (in subscriptions or on server) where statistics may be undefined if there is no table selected.
                // statistics should never be undefined at this point but this is a workaround to avoid the crash until I can find the bug.
                if (this._settings.statistics) {
                    show_column_n_check_box.enabled = contains(this._settings.statistics.map(stat => stat.Id), 'ColumnN') || contains(this._settings.statistics.map(stat => stat.Id), 'BaseN');
                }
            }
            group.add(show_column_n_check_box);
            group.onContextSelected = any_context_selected;

            // FORMATTING
            var group = page.addGroup(Translate('Formatting'), true);
            group.getDynamicContextLabels = () => { return this._getAllContexts('flowLabelFont').names; };
            var dynamic_binding = this._getDynamicFontBinding(group, 'flowLabelFont');
            var font_controls = new Controls.FontControls('flowLabelFontControl', Translate('Font:'), this._getDynamicFontBinding(group, 'flowLabelFont'), false);
            group.add(font_controls);
            var colour_control = new Controls.ColourControl('flowColourControl', Translate('Color:'), Translate('Select color for flow'), this._getFlowColourBinding(group));
            colour_control.enabled = false;
            group.onContextSelected = any_context_selected;
            group.add(colour_control);
            var show_values_dropdown = new Controls.MappedComboBoxControl('showValuesComboBox', Translate('Show Values:'), Translate('Show values on flow labels'), () => this._showValuesNameMap, this._getSetting<string>('showValues'));
            group.add(show_values_dropdown);
            var value_combo_box = new Controls.MappedComboBoxControl(
                'valueToShowComboBox',
                Translate('Value:'),
                Translate('Select the statistic to display'),
                () => this._getDisplayValueNameMap(),
                this._getDisplayValueBinding()
                );
            group.add(value_combo_box);
            var flow_labels_group = group;
            group.onContextSelected = () => {
                var enabled = !flow_labels_group.hasGlobalContextSelected();
                colour_control.enabled = enabled;

                flow_labels_group.refreshControls();
                any_context_selected();
            };

            // NETS
            group = page.addGroup(Translate('NETs'), false);
            var label = Translate('Show column NET:');
            var tooltip = Translate('Show NET column, which is the total of all other columns');
            group.add(new Controls.NetSumControl('colNetSumComboBox', label, tooltip, this._getStringBindingWithoutDefaults('colNetSum')));
            var label = Translate('Show row NET:');
            var tooltip = Translate('Show NET row, which is the totals of all other rows');
            group.add(new Controls.NetSumControl('rowNetSumComboBox', label, tooltip, this._getStringBindingWithoutDefaults('rowNetSum')));

            // MAXIMUM NUMBER OF RANKS
            var group = page.addGroup(Translate('Number of Ranks'), false);
            var up_down = new Controls.UpDown(
                'maxRanks',
                Translate('Number of ranks:'),
                Translate('Set the maximum number of items to display'),
                this._getSetting<number>('maxRanks'));
            up_down.min = 1;
            up_down.max = 1000;
            group.add(up_down);

            // NUMBER LABELS
            group = page.addGroup(Translate('Numbers'), false);
            var font_controls = new Controls.FontControls(
                'numberLabelFont',
                Translate('Font:'),
                this._getFontBinding('numberLabelFont'),
                false);
            group.add(font_controls);

            // RANKING STATISTIC
            var group = page.addGroup(Translate('Ranking Statistic'), false);
            var combo_box = new Controls.MappedComboBoxControl(
                'rankingStatistic',
                Translate('Statistic:'),
                Translate('Select the statistic to use for ranking items'),
                () => this._getRankingStatisticNameMap(),
                this._getRankingStatisticIdBinding()
            );
            group.add(combo_box);

            var min_value_control = new Controls.UpDown(
                'minValue',
                Translate('Minimum value:'),
                Translate('Minimum value to rank. Items with smaller values will be ignored.'),
                this._getSetting<number>('minValue')
            );
            // Allow negative values.
            min_value_control.min = -999999;
            this._updateMinValueControl = (stat: StatisticElement, value: number) => {
                min_value_control.decimalPlaces = stat.DecimalPlaces;
                min_value_control.binding.setValue(value);
                min_value_control.refresh();
            }
            group.add(min_value_control);

            page.show();
            // Ensure render() is performed next, so that the Ribbon controls can be updated to reflect the current settings.
            this._dirty = true;
        }

        onResized(handleName: string) {
            var width = this._element.offsetWidth;
            var height = this._element.offsetHeight;

            this._dirty = true;
            console.log('RESIZE DIRTY');
            return { width: width, height: height };
        }

        exitEditMode() {
            this._isEditMode = false;
            this._inspector.removePage(this._settingsPage);
            this._settingsPage = null;
        }

        /** Renders the plot _and_ updates the object inspector (edit mode only). */
        render() {
            console.log('render');
            // We take care to track when our inputs change, to avoid re-rendering unless necessary.
            if (!this._dirty)
                return;
            this._dirty = false;

            // Remove the plot from the old rendering.
            while (this._element.firstChild)
                this._element.removeChild(this._element.firstChild);

            if (this._tabular) {
                if (!this._settings.rankingStatistic)
                    this._settings.rankingStatistic = this._selectRankingStatisticId(this._tabular.Statistics);
            }

            if (this._isEditMode) {
                this._settingsPage.refreshControls();
            }

            // Check for errors and make sure the hosting environment supports this plot,
            // and make sure there is some data that can be shown.
            if (!this._okToRender() || !this._hasDataToShow())
                return;

            var rankings = this._rankData();

            var num_rows = d3.max(rankings.map((r) => r.items.length));
            if (num_rows < 1) {
                this._setUserError(Translate('No data to rank. Please change your data selection.'));
                return;
            }

            var axisValues = this._getSetting<string>('showValues').getValue();

            var config: IRankingPlotDisplaySettings = {
                width: this._element.offsetWidth || undefined,      // Plot will calculate size if size is 0 or not defined.
                height: this._element.offsetHeight || undefined,    // Plot will calculate size if size is 0 or not defined.
                colourMap: this._getColourMap(),
                showAxisLabels: this._settings.showAxisLabels,
                axisLabelStyle: this._getSVGStyle('axisLabelFont'),
                columnLabelStyle: this._getSVGStyle('columnLabelFont'),
                itemStyle: this._getSVGStyle('flowLabelFont'),
                numberStyle: this._getSVGStyle('numberLabelFont'),
                labelStyleOverrides: this._getLabelFontOverrides(),
                flowStyleOverrides: this._getFlowFontOverrides(),
                backgroundStyle: this._getStringBindingWithoutDefaults('backgroundColour').getValue(),
                showValuesOnRight: axisValues === 'right'
            };

            var id = 'ranking-plot-' + this.getGuid();

            var id_span = document.createElement('span');
            id_span.setAttribute('id', id);
            this._element.appendChild(id_span);

            var plot = new RankingPlot(id, config, rankings, this._getFlowLabels());
            plot.title = this._getTitle();
            plot.yAxisLabel = this._getYAxisLabel();
            plot.lastRankings = this._doNotAnimateFlag ? null : this._lastRankings;
            plot.render();

            this._lastRankings = rankings;
        }

        doNotAnimate() {
            this._doNotAnimateFlag = true;
        }

        private _getGlobalColumnLabelSettings() {
            var defaults = this._defaultSettings.columnLabelFont;
            var settings = this._settings.columnLabelFont;
            return JavaScriptItemHelper.coalesceFontSettings(defaults, settings);
        }

        private _getColumnLabelSettingsByContext(title: string): IFontSettings {
            var id = this._columnContexts.nameToId[title];
            /** current global settings are the defaults for the per item settings */
            var defaults = this._getGlobalColumnLabelSettings();
            if (!this._settings.columnLabelFontOverrides)
                this._settings.columnLabelFontOverrides = {};
            var settings = this._settings.columnLabelFontOverrides[id];
            return JavaScriptItemHelper.coalesceFontSettings(defaults, settings);
        }

        private _getGlobalFlowLabelSettings() {
            var defaults = this._defaultSettings.flowLabelFont;
            var settings = this._settings.flowLabelFont;
            return JavaScriptItemHelper.coalesceFontSettings(defaults, settings);
        }

        private _getFlowLabelSettingsByContext(title: string) {
            var id = this._flowContexts.nameToId[title];
            /** current global settings are the defaults for the per item settings */
            var defaults = this._getGlobalFlowLabelSettings();
            if (!this._settings.flowLabelFontOverrides)
                this._settings.flowLabelFontOverrides = {};
            var settings = this._settings.flowLabelFontOverrides[id];
            return JavaScriptItemHelper.coalesceFontSettings(defaults, settings);
        }

        private _getDynamicFontBinding(group: Controls.Group, settingName: string): Settings.IGeneralBinding {
            var override_name = settingName + 'Overrides';
            var binding = { getValue: () => this._settings[settingName], setValue: (value: IFontSettings) => { this._settings[settingName] = value; } };
            var global = new Settings.FontSetting(() => this._defaultSettings[settingName], binding);
            // function that selects which (non-global) binding to return based on the current context.
            var override = (key: string) => {
                if (!this._settings[override_name])
                    this._settings[override_name] = {};
                var key = group.getSelectedContext();
                var contexts = this._getContexts(settingName);
                return {
                    getValue: () => {
                        var id = contexts.nameToId[key];
                        if (!this._settings[override_name])
                            this._settings[override_name] = {};
                        return this._settings[override_name][id];
                    },
                    setValue: (value: IFontSettings) => {
                        var id = contexts.nameToId[key];
                        if (!this._settings[override_name])
                            this._settings[override_name] = {};
                        this._settings[override_name][id] = value;
                    }
                };
            }
            var local_binding = new Settings.DynamicBinding<IFontSettings>(group);
            local_binding.getBinding = override;
            // DONT REMOVE, TODO: Alan implement this properly.
            //local_binding.getBinding = override;

            // After global context is changed, save all local settings so that
            // overrides are removed if they are the same as the corresponding global values.
            //global.onSettingsChanged = () => {
            //    var contexts = this._getContexts(settingName);
            //    contexts.titles.forEach(title => { override(contexts.titleToId[title]) });
            //    var overrides: { [key: string]: IFontSettings } = this._settings[override_name];
            //    if (overrides) {
            //        for (var i = 0; i < overrides.keys; ++i)
            //    }
            //};

            var dynamic_binding = new Settings.DynamicFontSetting(group, global, local_binding);
            dynamic_binding.onSettingsChanged = () => {
                this._onAfterSettingsChanged();
            };
            return dynamic_binding;
        }

        private _getFontBinding(settingName: string): Settings.IBinding<IFontSettings> {
            var binding = { getValue: () => this._settings[settingName], setValue: (value: IFontSettings) => { this._settings[settingName] = value; } };
            var setting = new Settings.FontSetting(() => this._defaultSettings[settingName], binding);
            setting.onSettingsChanged = () => {
                this._onAfterSettingsChanged();
            };
            return setting;
        }

        private _getFlowColourBinding(group: Controls.Group): Settings.Setting<string> {
            // Binding for user set value that overrides default value.
            var binding = {
                getValue: () => {
                    if (!this._settings.colourMap)
                        return undefined;
                    var key = group.getSelectedContext();
                    var contexts = this._getRowContexts();
                    var id = contexts.nameToId[key];
                    return id ? this._settings.colourMap[id] : undefined;
                },
                setValue: (value: string): void => {
                    if (!group.hasGlobalContextSelected()) {
                        var key = group.getSelectedContext();
                        var contexts = this._getRowContexts();
                        var id = contexts.nameToId[key];
                        if (id) {
                            if (!this._settings.colourMap)
                                this._settings.colourMap = {};
                            this._settings.colourMap[id] = value;
                            this._onAfterSettingsChanged();
                        }
                    }
                }
            };
            var get_default = () => {
                if (group.hasGlobalContextSelected())
                    return undefined;
                var default_colours = this._getDefaultColourMap();
                if (!default_colours)
                    return undefined;
                var key = group.getSelectedContext();
                var contexts = this._getRowContexts();
                var id = contexts.nameToId[key];
                return id ? default_colours[id] : undefined;
            }
            return new Settings.Setting<string>(get_default, binding);
        }

        /** Coalesce default and user defined colours into a single map. */
        private _getColourMap(): { [flowId: string]:string } {
            var colour_map: { [flowId: string]: string } = {};
            var default_colours = this._getDefaultColourMap();

            // Make a copy of the defaut colour map.            
            for (var key in this._defaultSettings.colourMap) {
                colour_map[key] = this._defaultSettings.colourMap[key];
            }

            var user_defined_colours = this._settings.colourMap;
            // Replace default colours with user defined colours.
            for (var key in user_defined_colours) {
                colour_map[key] = user_defined_colours[key];
            }
            return colour_map;
        }

        /** Get a simple binding for a string value without support for saving or loading defaults.
         * calling setValue calls _onAfterSettingsChanged after setting the value. */
        private _getStringBindingWithoutDefaults(settingName: string): Settings.IBinding<string> {
            var get_value = () => {
                return this._settings[settingName];
            };
            var set_value = (value: string) => {
                this._settings[settingName] = value;
                this._onAfterSettingsChanged();
            };
            return {
                getValue: get_value,
                setValue: set_value
            };
        }

        /** Get a simple binding for a boolean value without support for saving or loading defaults. */
        private _getBooleanBindingWithoutDefaults(settingName: string): Settings.IBinding<boolean> {
            var get_value = () => {
                return this._settings[settingName];
            };
            var set_value = (value: boolean) => {
                this._settings[settingName] = value;
                this._onAfterSettingsChanged();
            };
            return {
                getValue: get_value,
                setValue: set_value
            };
        }

        private _getSetting<T>(settingName: string): Settings.Setting<T> {
            var binding = {
                getValue: () => this._settings[settingName],
                setValue: (value: T) => { this._settings[settingName] = value; }
            };
            var setting = new Settings.Setting<T>(() => this._defaultSettings[settingName], binding);
            setting.onSettingsChanged = () => {
                this._onAfterSettingsChanged();
            };
            return setting;
        }

        private _getDisplayValueNameMap(): Settings.INameMap {
            if (!this._settings || !this._settings.statistics)
                return { names: [], nameToId: {}, idToName: {} };
            // Get all statistics.
            var stats = this._settings.statistics;
            var names: string[] = [];
            var ids: string[] = [];
            for (var i in stats) {
                var stat = stats[i];
                ids[i] = stat.Id;
                names[i] = stat.Name;
            }
            return new Settings.NameMap(ids, names);
        }

        private _getDisplayValueBinding(): Settings.IGeneralBinding {
            var setting = new Settings.Setting<string>(
				// The default value to display value is the ranking statistic.
                () => this._settings.rankingStatistic && this._getRankingStatistic().Id,
                {
                    setValue: (value) => { this._settings.displayValueId = value },
                    getValue: () => this._settings.displayValueId
                }
            );
            setting.onSettingsChanged = () => {
                this._updateRequiredStatistics();
                this._onAfterSettingsChanged();
            }
            return setting;
        }

        private _getRankingStatistic(): StatisticElement {
            if (!this._settings || !this._settings.rankingStatistic)
                return undefined;

            return this._settings.statistics.filter(stat => stat.Id == this._settings.rankingStatistic)[0];
        }

        private _getRankingStatisticNameMap(): Settings.INameMap {
            if (!this._settings || !this._settings.statistics)
                return { names: [], nameToId: {}, idToName: {} };
            // Get all numeric statistics.
            var numeric_stats = this._settings.statistics.filter(stat => stat.IsNumber);
            var names: string[] = [];
            var ids: string[] = [];
            for (var i in numeric_stats) {
                var stat = numeric_stats[i];
                ids[i] = stat.Id;
                names[i] = stat.Name;
            }
            return new Settings.NameMap(ids, names);
        }

        private _getRankingStatisticIdBinding(): Settings.IGeneralBinding {
            var binding = {
                getValue: (): string => {
                    if (!this._settings.statistics || !this._settings.rankingStatistic)
                        return undefined;
                    var ranking_stat_id = this._settings.rankingStatistic;
                    var statistic = this._settings.statistics.filter((stat) => stat.Id === ranking_stat_id)[0];
                    return statistic ? statistic.Id : undefined;
                },
                setValue: (new_stat_id: string) => {
                    // Update our internal setting that tracks which statistic to show in the dropdown.
                    this._settings.rankingStatistic = new_stat_id;

                    this._updateRequiredStatistics();

                    // Reset the value in the minimum value control.
                    this._updateMinValueControl(this._getRankingStatistic(), this._defaultSettings.minValue);
                    this._onAfterSettingsChanged();
                }
            };
            return binding;
        }

        /** Update _settings.requiredStatisticIds */
        private _updateRequiredStatistics() {
            // Get the IDs of the statistics currently available.
            var available = this._tabular ? this._tabular.Statistics.map(stat => stat.Id) : [];
            if (!this._settings.rankingStatistic)
                this._settings.rankingStatistic = this._tabular && this._selectRankingStatisticId(this._tabular.Statistics);
            var required: string[] = this._settings.rankingStatistic ? [this._settings.rankingStatistic] : [];
            var display_statistic_id = this._getDisplayValueBinding().getValue();
            if (display_statistic_id && (display_statistic_id !== this._settings.rankingStatistic))
                required.push(display_statistic_id);
            if (this._settings.showColumnN) {
                if (!contains(required, 'ColumnN'))
                    required.push('ColumnN');
                if (!contains(required, 'BaseN'))
                required.push('BaseN');
            }
            // If there are statistics that we need that we don't already have, tell the server we need new statistics.
            this._settings.selectedStatisticIds = isSubset(required, available) ? undefined : required;
        }

        private _getSVGStyle(settingName: string): SVG.FontStyle {
            var binding = this._getFontBinding(settingName);
            return new SVG.FontStyle(binding.getValue());
        }

        private _onAfterSettingsChanged() {
            // Some client-side settings need a re-render to take effect, and
            // don't expect a response from the server.
            this._dirty = true;
            // Tell the server about the new settings.
            this._save();
            console.log('SET VALUE DIRTY');
        }

        /** Select the set of statistics needed to determine rankings.
          * Some statistics may be needed for filtering (e.g. to remove NET rows) */
        private _selectRequiredStatistics() : string[] {
            var stats : string[] = [];
            if (this._settings.displayValueId)
                stats.push(this._settings.displayValueId);
            if (this._settings.rankingStatistic)
                stats.push(this._settings.rankingStatistic);

            return stats;
        }

        /** Check for errors and check that the host system supports rendering of this plot type. */
        private _okToRender(): boolean {
            if (this._errors) {
                this._setUserError(this._errors.join(' '));
                return false;
            }

            // Testing if d3 is not available.
            if (typeof d3 === 'undefined') {
                this._setUserError(format(Translate('Your web browser is too old to show a {0}.'), new QRankingPlotFactory().typeDisplayName()));
                return false;
            }

            return true;
        }

        /** Check if there is suitable data to display. If not display an error message and return false. */
        private _hasDataToShow(): boolean {
            var ndims = this._tabular.CategoricalDimensions.length;
            if (ndims !== 2) {
                this._setUserError(format(Translate('Ranking Plot does not support {0} dimensional tables.'), ndims));
                return false;
            }
            // Check that there are numeric statistics available to rank.
            if (!this._selectRankingStatisticId(this._tabular.Statistics)) {
                this._setUserError(Translate('Ranking Plot only supports numeric statistics.'));
                return false;
            }

            return true;
        }

        private _setUserError(message: string) {
            var node = d3.select(this._element);
            node.append("svg:svg")
                .attr("width", "400")
                .attr("height", "60")
                .append("text")
                .text(message)
                .attr("x", "50%").attr("y", "50%")
                .attr("alignment-baseline", "middle")
                .attr("text-anchor", "middle");
        }

        /** Update flow and Column context variables from data. */
        private _updateSettingsContexts() {
            this._columnContexts = this._getAllContexts('columnLabelFont');
            this._flowContexts = this._getAllContexts('flowLabelFont');
        }

        /** Get the index of a statistic in the statistics available in the table data.
          * Returns -1 if the specified ID is not the id of an available statistic. */
        private _getIndexForStatistic(id: string) {
            return this._tabular.Statistics.map(stat => stat.Id).indexOf(id);
        }

        private _getAllNumericStatistics(): string[] {
            if (!this._settings || !this._settings.statistics)
                return [];
            // Return names of all numeric statistics.
            return this._settings.statistics.filter(stat => stat.IsNumber).map((stat) => stat.Name)
        }

        /** Get the index of the ranking statistic in the statistics available in the table data.
          * Returns -1 if the ranking statistic is not currently available. */
        private _getRankingStatisticIndex(): number {
            return this._getIndexForStatistic(this._settings.rankingStatistic);
        }

        /** Select a statistic for ranking from the supplied statistics.
          * Returns undefined if none found. */
        private _selectRankingStatisticId(statistics: StatisticElement[]): string {
            var ranking_stat_id = this._settings.rankingStatistic;
            // If a ranking statistic has already been selected,
            // Check if the statistic is available for plotting.
            if (ranking_stat_id) {
                for (var i = 0; i < statistics.length; i++)
                    if (statistics[i].Id == ranking_stat_id)
                        return ranking_stat_id;
            }
            // If the selected statistic is not valid for ranking plots (i.e. not a number),
            // choose the first available numeric statistic.
            for (var i = 0; i < statistics.length; i++)
                if (statistics[i].IsNumber)
                    return statistics[i].Id;

            return undefined;
        }

        private _getTitle(): string {
            return this._tabular.CategoricalDimensions[1].Name;
        }

        private _getYAxisLabel(): string {
            return this._tabular.CategoricalDimensions[0].Name;
        }

        /** Rank table data. */
        private _rankData(): Ranking[] {
            var num_cols = this._tabular.CategoricalDimensions[1].Count;
            var rankings: Ranking[] = [];
            for (var c = 0; c < num_cols; c++) {
                rankings.push(this._rankColumn(c));
            }
            return rankings;
        }

        /** Rank the selected statistic for a specifed column */
        private _rankColumn(col: number): Ranking {
            // Get values for settings.
            var show_column_n = this._getSetting<boolean>('showColumnN').getValue();
            var column_n_statistic = this._tabular.getStatistic('ColumnN');
            // If column n is not available, use base n
            if (!column_n_statistic)
                column_n_statistic = this._tabular.getStatistic('BaseN');
            if (!column_n_statistic)
                show_column_n = false;
            var show_values = this._getSetting<string>('showValues').getValue() !== 'no';
            // Minimum value to consider: smaller values are ignored.
            var min_value = this._getSetting<number>('minValue').getValue();
            var max_ranks = this._getSetting<number>('maxRanks').getValue();
            var stat_index = this._getRankingStatisticIndex();
            var tabular = this._tabular;
            var label = tabular.CategoricalDimensions[1].Elements[col].Name;
            if (stat_index == -1)
                return new Ranking(label, [], []);
            var statistic = tabular.Statistics[stat_index];
            var display_stat = tabular.getStatistic(this._getDisplayValueBinding().getValue());
            if (!display_stat)
                display_stat = statistic;
            var decimal_places = statistic.DecimalPlaces;
            var values = this._getDataValuesForColumn(col);
            var indices = this._sortOrder(values.map(value => (value.IsBlank || isNaN(value.Value) ? Number.NEGATIVE_INFINITY : <number>value.Value)));
            var num_rows = values.length;
            // Criterion for ignoring a data value.
            var exclude = (value: DataPoint) => (value.IsBlank || value.Value === undefined || isNaN(value.Value) || value.Value < min_value);

            // Make an array of data item identifiers in ranking order and and array of ties, skipping excluded values.
            var items: string[] = [];
            var ties: number[] = [];
            var formatted_values: string[] = show_values ? [] : undefined;
            var column_n_min = Number.POSITIVE_INFINITY;
            var column_n_max = Number.NEGATIVE_INFINITY;
            var prev: DataPoint = { Value: null, Significance: null, ExtraText: null };   // previous number (in sorted order).
            // Loop through values in sorted order.
            for (var r = 0; r < num_rows; r++) {
                var index = indices[r]; // index of value (sorted).
                var dataPoint = values[index];
                var value = <number> dataPoint.Value;
                if (show_column_n) {
                    var column_n = this._tabular.dataPoint(column_n_statistic.Id, [index, col]).Value;
                    column_n_min = Math.min(column_n_min, column_n);
                    column_n_max = Math.max(column_n_max, column_n);
                }
                if (!exclude(dataPoint)) {
                    // If previous item has the same value as the current one, add row index of previous item to ties array.
                    if (prev.Value === value)
                        ties.push(items.length - 1);
                    items.push(tabular.CategoricalDimensions[0].Elements[index].Id);
                    if (show_values) {
                        var display_point = this._tabular.dataPoint(display_stat.Id, [index, col]);
                        formatted_values.push(Data.formatStatistic(display_point.Value, display_stat));
                    }
                    prev = dataPoint;
                    // Quit if we have enough items.
                    if (items.length === max_ranks)
                        break;
                }
            }
            if (show_column_n) {
                var range_min = Data.formatStatistic(column_n_min, column_n_statistic);
                var column_range = column_n_min === column_n_max ? range_min
                    : format(Translate("{0} to {1}"), range_min, Data.formatStatistic(column_n_max, column_n_statistic));
                label += '\n' + column_range;
            }
            return new Ranking(label, items, ties, formatted_values);
        }

        /** Get array of unfiltered ranking statistic values for a given column in table row order */
        private _getDataValuesForColumn(col: number): DataPoint[]{
            var values: DataPoint[] = [];
            if (!this._tabular)
                return values;
            var ranking_statistic = this._tabular.getStatistic(this._settings.rankingStatistic);
            if (!ranking_statistic)
                return values;
            var num_values = this._tabular.CategoricalDimensions[0].Count;
            for (var r = 0; r < num_values; r++)
                values[r] = this._tabular.dataPoint(ranking_statistic.Id, [r, col]);
            return values;
        }

        /** Return an array of indices that sorts an array of values in ranking order */
        private _sortOrder(values: number[]): number[] {
            // Determine the sort order.
            var indices = d3.range(0, values.length);
            // TODO: Alan: Figure out how to avoid sorting all data for larger datasets.
            // Check for equal values and compare table order to ensure that sort preserves table order.
            indices.sort((i, j) => (values[i] == values[j]) ? (i - j) : values[j] - values[i]);
            return indices;
        }

        /** Get the mapping from column data values to colours */
        private _getDefaultColourMap() : { [id: string]: string } {
            /** The colour map is calculated from server default colour values when needed */
            if (this._defaultSettings.colourMap === undefined)
                this._defaultSettings.colourMap = this._makeDefaultColourMap();
            return this._defaultSettings.colourMap;
        }

        /** Determine the colour for rendering each flow based on the default colours. */
        private _makeDefaultColourMap(): { [flowId: string]: string } {
            var keys = this._tabular.CategoricalDimensions[0].Elements.map(e => e.Id);

            var map: { [id: string]: string } = {};
            for (var i = 0; i < keys.length; ++i)
                map[keys[i]] = this._defaultSettings.colours[i % this._defaultSettings.colours.length];
            return map;
        }

        /** Add a global context to a set of contexts */
        private _addGlobalContext(contexts: Settings.INameMap) {
            // Include our global context.
            contexts.names.splice(0, 0, this._all);
            contexts.nameToId[this._all] = this._all;
            contexts.idToName[this._all] = this._all;
        }

        private _getAllContexts(settingName: string) {
            var contexts = this._getContexts(settingName);
            this._addGlobalContext(contexts);
            return contexts;
        }

        /** Returns a map from flow IDs to labels */
        private _getFlowLabels(): { [id: string]: string} {
            var tabular = this._tabular;

            var num_rows = tabular.CategoricalDimensions[0].Count;
            var labels: { [id: string]: string } = {};
            for (var r = 0; r < num_rows; r++) {
                var element = tabular.CategoricalDimensions[0].Elements[r];
                labels[element.Id] = element.Name;
            }
            return labels;
        }

        private _getRowContexts(): Settings.INameMap {
            return this._getContextsForDimension(0);
        }

        private _getColContexts(): Settings.INameMap {
            return this._getContextsForDimension(1);
        }

        private _getContextsForDimension(dim: number) : Settings.INameMap {
            var titles: string[] = [];
            var title_to_id: { [title: string]: string } = {};
            var id_to_title: { [id: string]: string } = {};

            if (this._tabular) {
                var dimension_data = this._tabular.CategoricalDimensions[dim];
                var num_rows = dimension_data.Count;
                for (var r = 0; r < num_rows; r++) {
                    var element = dimension_data.Elements[r];
                    var id = element.Id;
                    var name = element.Name;
                    titles.push(name);
                    id_to_title[id] = name;
                    title_to_id[name] = id;
                }
            }

            return { names: titles, nameToId: title_to_id, idToName: id_to_title };
        }

        private _getContexts(settingName: string): Settings.INameMap {
            switch (settingName) {
                case 'columnLabelFont':
                    return this._getColContexts();
                case 'flowLabelFont':
                    return this._getRowContexts();
            }
            return undefined;
        }

        private _getShowValuesNameMap(): Settings.INameMap {
            return new Settings.NameMap(['no', 'below', 'right'], [Translate('No'), Translate('Yes - Below'), Translate('Yes - Right')]);
        }

        private _getLabelFontOverrides() {
            var overrides = [];
            for (var id in this._settings.columnLabelFontOverrides) {
                var title = this._columnContexts.idToName[id];
                var labels = this._tabular.CategoricalDimensions[1].Elements.map(e => e.Name);
                var index = labels.indexOf(title);
                if (this._settings.columnLabelFontOverrides && this._settings.columnLabelFontOverrides[id])
                    overrides[index] = new SVG.FontStyle(this._getColumnLabelSettingsByContext(title));
            }
            return overrides;
        }

        private _getFlowFontOverrides() : { [id: string]: any } {
            var overrides: { [id: string]: any } = {};
            for (var id in this._settings.flowLabelFontOverrides) {
                var title = this._flowContexts.idToName[id];
                if (this._settings.flowLabelFontOverrides && this._settings.flowLabelFontOverrides[id])
                    overrides[id] = new SVG.FontStyle(this._getFlowLabelSettingsByContext(title));
            }
            return overrides;
        }

        private _save() {
            this._saveSettingsToServer(this._settings);
        }
    }

    /** A group of items in rank order plus a label for the group */
    class Ranking {
        label: string;
        /** Array of unique (per this structure) ids in rank order */
        items: string[] = [];

        /** If values are supplied, they are shown on each ranked item. */
        values: string[] = [];

        /**
         * Indices of values that are tied with the following value
         * E.g. [2, 4, 5] means items 2 and 3 have equal rank and items 4, 5 and 6 all have equal rank.
         */
        ties: number[];

        constructor(label: string, items: string[], ties: number[], labels?: string[]) {
            this.label = label;
            this.items = items;
            this.ties = ties || [];
            this.values = labels;
        }
    }

    interface IRankingPosition {
        col: number;
        row: number;
    }

    interface IRankMap {
        [id: string]: number;
    }

    interface IRankingPlotDisplaySettings {
        /** Width of plot including ranking and question labels. */
        width: number;
        /** Height of plot including column and questions labels. */
        height: number;

        /** Style for background fill */
        backgroundStyle?: string;

        showAxisLabels?: boolean;
        /** Font/style for axis labels. */
        axisLabelStyle: SVG.FontStyle;
        /** Font/style for item labels. */
        itemStyle: SVG.FontStyle;
        /** If axis values are supplied, show them at the right of the label.
          * If false, show the value underneath the label. */
        showValuesOnRight?: boolean;
        /** Font/style for rank numbers */
        numberStyle: SVG.FontStyle;

        /** Duration for animation of ranks. */
        animationDuration?: number;
        /** Duration for transition to higlighted state */
        hilightTransitionDuration?: number;
        /** Horizontal padding for labels */
        horizontalPadding?: number;
        /** Horizontal padding for labels */
        verticalPadding?: number;
        /** size of gap between ranks specified as a proportion of item widths. */
        gapProportion?: number;
        /** Object mapping item ids to colours. */
        colourMap?: { [id: string]: string };
        /** Opacity for displaying flows. */
        flowOpacity?;
        /** Font for category (column) labels. */
        columnLabelStyle?: SVG.FontStyle;
        /** Override global settings for column labels */
        labelStyleOverrides: any[];
        /** Override settings for flows */
        flowStyleOverrides?: { [id: string]: any; }
    }

    class Flow {
        id: string;
        items: IRankingPosition[];

        constructor(id: string, positions: IRankingPosition[]) {
            this.id = id;
            this.items = positions;
        }
    }

    // TODO: Alan: create separate interface IRankingPlotLayoutSettings?

    class RankingPlot {
        title: string = null;
        yAxisLabel: string = null;
        xAxisLabel: string = null;
        displaySettings: IRankingPlotDisplaySettings;
        rankings: Ranking[];
        lastRankings: Ranking[] = null;

        private _elementId: string;
        private _flowLabels: { [Id: string] : string };
        private _body: D3.Selection;
        private _titleNode: D3.Selection;
        private _columnLabels: D3.Selection;
        private _yAxisLabel: D3.Selection;
        private _rankNumbers: D3.Selection;
        private _background: D3.Selection;
        private _plot: D3.Selection;

        private _numRows: number;
        private _titleHeight: number = 0;
        private _titleMaxWidth: number = 0;         // Max width allowed for title, when it was last rendered.
        private _yAxisLabelWidth: number = 0;
        private _yAxisLabelMaxLength: number = 0;   // Max allowed text length for y axis label when it was last rendered.
        private _columnLabelHeight: number = 0;
        private _numberWidth: number = 0;
        private _itemWidth: number;
        private _itemHeight: number;
        private _plotWidth: number;     // width of plot excluding title / axis labels
        private _plotHeight: number;    // height of plot excluding title / axis labels
        private _equalityIndicatorWidth: number;
        private _equalityIndicatorHeight: number;
        private _equalityIndicatorInset: number;
        private _horizontalSpacing: number = 0;
        private _gap: number = 0;

        // Horizontal padding around text and value blocks
        private static _labelHorizontalPadding = 4;

        // Vertical padding between text and value blocks, when the value is shown below the text
        private static _textAndValueSeparation = 4;

        /**
         * Construct a RankingPlot
         */
        constructor(element_id: string, configuration: IRankingPlotDisplaySettings, rankings: Ranking[], flow_labels: { [id: string]: string }) {
            this._elementId = element_id;
            this.rankings = rankings;
            /** labels is an object that maps IDs to string labels */
            this._flowLabels = flow_labels;

            // initialization
            this.displaySettings = configuration;

            this.displaySettings.hilightTransitionDuration = configuration.hilightTransitionDuration || 500;
            this.displaySettings.animationDuration = configuration.animationDuration || 800;
            this.displaySettings.horizontalPadding = 5;
            this.displaySettings.verticalPadding = 4;
            this.displaySettings.gapProportion = 0.4;
            this.displaySettings.colourMap = configuration.colourMap;
            this.displaySettings.flowOpacity = 0.8;

            this._numRows = d3.max(this.rankings.map((r) => r.items.length));
        }

        render() {
            // Set displaySettings.width and displaySettings.height, if required.
            this._estimateSize();

            // If the previous rankings are the same as the current rankings,
            // set the previous rankings to null to avoid animation.
            if (Settings.equal(this.rankings, this.lastRankings)) {
                this.lastRankings = null;
            }

            // Create the svg node.
            this._body = d3.select("#" + this._elementId)
                .append("svg:svg")
                .attr("class", "ranking-plot")
                .attr("width", this.displaySettings.width.toFixed())
                .attr("height", this.displaySettings.height.toFixed());            

            // Render the background.
            this._renderBackground();

            // Render title and axis labels (if required).
            this._renderTitlesAndLabels();

            // Render the plot area.
            this._renderPlot();
        }

        redraw() {
        }

        private _renderTitlesAndLabels(): void {
            // Render rank numbers first so that width of rank number labels is known.
            this._renderRankNumbers();

            // May need to re-render up to three times to get final sizes, as wrapping of vertical and horizontal titles are interdependent.
            for (var retries = 3; retries > 0; retries--) {
                // Render title (if there is one).
                this._renderTitle();

                // Render y axis title (if there is one to display).
                this._renderYAxisTitle();

                // Render column labels before rendering the plot so that the height of the column labels is known.
                this._renderColumnLabels();
            }

            // Now that the heights are known, we can calculate the vertical positions of the numbers.
            this._repositionNumbers();
        }

        private _renderPlot(): void {
            // Create a group node for the plot.
            this._plot = this._body.append("g");

            this._renderFlows();

            // Position the plot, leaving room for the labels.
            var x = this._numberWidth + this._yAxisLabelWidth;
            var y = this._titleHeight + this._columnLabelHeight;
            this._plot.attr("transform", "translate(" + x.toFixed() + "," + y.toFixed() + ")");
        }

        private _renderBackground(): void {
            var style = this.displaySettings.backgroundStyle;
            if (!style)
                return;

            this._background = this._body.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.displaySettings.width.toFixed())
                .attr("height", this.displaySettings.height.toFixed())
                .attr("fill", this.displaySettings.backgroundStyle)
                .attr("stroke", "none");
        }

        /** Add svg nodes to draw flows. Nodes are added to this._plot. */
        private _renderFlows() {
            var flows = this._findFlows();

            RankingPlot._sort(flows);

            // Render flows in reverse order with 100% opacity, so the colour of the top layer
            // is the same colour as the first translucent layer at each point.
            flows.reverse().forEach(
                flow => {
                    // Set opacity to 1.0 so that background does not show through.
                    this._renderFlow(flow, 1.0);
                });

            // Render the flows with translucency.
            // Flows are reversed again to restore them to the intended order.
            // Bottom layer is always on top of an opaque layer of the same colour.
            flows.reverse().forEach(
                flow => {
                    // This time, use the defined opacity.
                    this._renderFlow(flow, this.displaySettings.flowOpacity);
                });

            this._renderAllEqualityIndicators(flows);

            // Render the labels for each flow.
            flows.forEach(flow => this._renderLabels(flow.items));
        }

        private _renderAllEqualityIndicators(flows: Flow[]) {
            // Make sure layout parameters for equality indicators are up to date.
            this._equalityIndicatorInset = this._itemHeight / 12;
            this._equalityIndicatorHeight = this._itemHeight / 10;
            // If the item is very narrow vertically compared to its height,
            // limit the width of the equality indicators to limit the aspect ratio.
            var width = Math.min(this._itemWidth, 4 * this._itemHeight);
            this._equalityIndicatorWidth = 0.25 * width;

            // Render the equality indicators for each flow.
            flows.forEach(flow => this._renderEquals(flow));
        }

        /** Append an svg path representing a flow onto the plot document node. */
        private _renderFlow(flow: Flow, opacity: number) {
            var id = flow.id;
            var plot = this._plot;
            var colour = this._flowColour(id);
            var hilight_colour = RankingPlot._highlightColour(colour);
            var highlight = function () { d3.select(this).attr('fill', hilight_colour); };
            var unhighlight = function () {
                var colour = d3.select(this).attr('flow-colour');
                d3.select(this).attr('fill', colour);
            }
            var animate = this.lastRankings != null;
            var path = animate ? this._renderPreviousPath(flow) : this._renderFlowPath(flow.items);
            var path_node = plot.append("path")
                .attr('flow-id', id)
                .attr('flow-colour', colour)
                .attr('fill', colour)
                .attr("d", path)
                .style("opacity", opacity);
            var on_mouseover = function (d, i) {
                plot.selectAll("[flow-id='" + id + "']").transition()
                    .ease('cubic-out')
                    .duration(200)
                    .each(highlight);
            };
            var on_mouseout = function (d, i) {
                plot.selectAll("[flow-id='" + id + "']").transition()
                    .ease('cubic-out')
                    .duration(200)
                    .each(unhighlight);
            };
            if (animate)
                path_node.transition()
                    .duration(this.displaySettings.animationDuration)
                    .attr('d', this._renderFlowPath(flow.items))
                    // Add mouseover event handlers after the transition
                    // so that they don't interfere with the transition.
                    .each('end', function () {
                    d3.select(this)
                        .on('mouseover', on_mouseover)
                        .on('mouseout', on_mouseout)
                    });
            else
                path_node
                    .on('mouseover', on_mouseover)
                    .on('mouseout', on_mouseout);
        }

        /** Generate the string of SVG path commands to render a flow. */
        private _renderFlowPath(flow: IRankingPosition[]): string {
            return SVG.renderPath(this._makeFlowPath(flow), true);
        }

        /** Trace the path around a flow.
          * If renderFirstItem / renderLastItem are set to false,
          * the connection to the first / last item are added, but the item itself is not rendered. */
        private _makeFlowPath(flow: IRankingPosition[], renderFirstItem = true, renderLastItem = true): Point[] {
            var item_width = this._itemWidth;
            var item_height = this._itemHeight;

            var path: Point[] = [];

            var start_i = renderFirstItem ? 0 : 1;
            var end_i   = flow.length - (renderLastItem ? 0 : 1);

            if (!renderFirstItem) {
                var item = flow[0];
                // Add top right corner of the first item.
                var pos = this._itemPosition(item.col, item.row);
                path.push(new Point(pos.x + item_width, pos.y));
            }

            // Add points for the top edge of the flow in left to right order.
            for (var i = start_i; i < end_i; i++) {
                var item = flow[i];
                // Add a line segment for the top of the i-th item.
                var pos = this._itemPosition(item.col, item.row);
                path.push(pos, new Point(pos.x + item_width, pos.y));
            }

            if (!renderLastItem) {
                var item = flow[length - 1];
                // Extend the path to the leftmost edge of the last item.
                var pos = this._itemPosition(item.col, item.row);
                path.push(pos, new Point(pos.x, pos.y + item_height));
            }

            // Add points for the bottom edge of the flow in right to left order.
            for (var i = end_i - 1; i >= start_i; i--) {
                var item = flow[i];
                // Add a line segment for the bottom of the i-th item.
                var pos = this._itemPosition(item.col, item.row);
                pos.y += item_height;
                path.push(new Point(pos.x + item_width, pos.y), pos);
            }

            if (!renderFirstItem) {
                var item = flow[0];
                // Add bottom right corner of the first item.
                var pos = this._itemPosition(item.col, item.row);
                path.push(new Point(pos.x + item_width, pos.y + item_width));
            }
            return path;
        }

        /** Calculate a highlight colour corresponding to a specifed flow colour. */
        private static _highlightColour(colour: string): D3.Color.Color {
            return d3.rgb(colour).brighter(0.5);
        }

        /**
         * Render the title text and update this._titleHeight.
         * Returns true if the title has already been rendered at the same height.
         */
        private _renderTitle(): void {
            if (!this._showTitle())
                return;

            var offset = this._numberWidth + this._yAxisLabelWidth;
            var width = this.displaySettings.width - offset;
            // If width has not changed, then the title has already been rendered at this width.
            if (width <= 0)
                width = this.displaySettings.width;

            if (this._titleMaxWidth === width)
                return;
            this._titleMaxWidth = width;

            var title_node = this._titleNode;
            if (!title_node)
                title_node = this._body.append("text");

            var x = width / 2 + offset;
            var padding = this.displaySettings.verticalPadding;
            title_node
                .attr("x", x.toFixed(1))
                .attr("y", padding.toFixed())
                .attr('dy', "1em")
                .attr("text-anchor", "middle")
                .text(this.title);
            var style = this.displaySettings.axisLabelStyle;
            style.applyTo(title_node);
            wrapWithTooltip(title_node, width);             

            var box = (<SVGTextElement>title_node.node()).getBBox();
            var height = box.height;

            this._titleHeight = height + 2 * padding;
            this._titleNode = title_node;
        }

        /**
         * Render y axis title if there is one and displaySettings.showAxisLabels is true,
         * and update this._yAxisLabelWidth.
         */
        private _renderYAxisTitle(): void {
            if (!this._showYAxisLabel())
                return;

            // y coordinate of top of the title
            var top = this._titleHeight + this._columnLabelHeight;
            // Will rotate by 90 degrees, height of plot becomes the "width".
            // Subtract the height of the title so the y axis title does not overlap the plot title.
            var max_text_length = this.displaySettings.height - top;
            if (max_text_length <= 0) {
                max_text_length = 0;
            }
            // If max_text_length has not changed, then the title has already been rendered at the current size.
            if (this._yAxisLabelMaxLength === max_text_length)
                return;
            this._yAxisLabelMaxLength = max_text_length;

            var group_node = this._yAxisLabel;
            var title_node: D3.Selection;
            if (group_node) {
                // Clear transform so text is measured correctly.
                group_node.attr('transform', null)
                title_node = group_node.select('text');
            } else {
                var group_node = this._body.append("g");
                title_node = group_node.append("text");
                this._yAxisLabel = group_node;
            }
            title_node
                .attr("x", 0)
                .attr("y", 0)
                .attr('dy', "1em")
                .attr("text-anchor", "middle")
                .text(this.yAxisLabel);
            var style = this.displaySettings.axisLabelStyle;
            style.applyTo(title_node);
            wrapWithTooltip(title_node, max_text_length);

            var box = (<SVGTextElement>group_node.node()).getBBox();
            var height = box.height;

            var padding = this.displaySettings.verticalPadding;
            var center_y = top + max_text_length / 2;

            // NOTE: Translate is applied in rotated coordinate system!!!
            group_node.attr("transform", "rotate(-90) translate(" + -center_y + "," + padding + ") ");

            this._yAxisLabelWidth = height + 2 * padding;
        }

        private _renderColumnLabels(element = this._body) {
            this._calculateWidths();

            var plot_x = this._yAxisLabelWidth + this._numberWidth;
            var plot_width = this.displaySettings.width - plot_x;
            if (plot_width <= 0)
                plot_width = this.displaySettings.width;

            if (this._plotWidth === plot_width)
                return;
            this._plotWidth = plot_width;

            var labels = this._columnLabels;
            if (labels)
                labels.remove();
            labels = element.append("g");

            for (var c = 0; c < this.rankings.length; ++c) {
                var x = c * this._horizontalSpacing;
                var text_node = labels.append("text")
                    .attr("x", x + this._itemWidth / 2)
                    .attr("text-anchor", "middle")
                    .text(this.rankings[c].label);
                var style = this._columnLabelStyle(c);
                style.applyTo(text_node);
                wrapWithTooltip(text_node, this._itemWidth);
            }

            var padding = this.displaySettings.verticalPadding;
            var box = (<SVGTextElement>labels.node()).getBBox();
            var height = box.height;

            // Position text at bottom of label area.
            var children = d3.selectAll(labels.node().childNodes);
            children.each(function () {
                var text = d3.select(this);
                var text_height = this.getBBox().height;
                text.attr('y', height - text_height + padding);
            });

            this._columnLabels = labels;
            this._columnLabelHeight = height + 2 * padding;

            var y_axis_labels_width = this._numberWidth + this._yAxisLabelWidth;

            // Move column labels so they don't overlap rank numbers or the title.
            this._columnLabels.attr("transform", "translate(" + plot_x.toFixed() + "," + this._titleHeight.toFixed() + ")");
        }

        /** Render labels for a flow. */
        private _renderLabels(flow: IRankingPosition[]) {
            flow.forEach(pos => this._renderFlowLabel(pos.col, pos.row));
        }

        /** Render equality indicators for a flow. */
        private _renderEquals(flow: Flow) {
            flow.items.forEach(pos => this._renderEqualityIndicators(pos.col, pos.row));
        }

        /** Render one flow label specified by its position in the table.
         *  The text and value are displayed in separate blocks. */
        private _renderFlowLabel(c: number, r: number) {
            var id = this._getId(c, r);
            if (id === undefined)
                return;
            
            var width_for_text = this._itemWidth;
            var height_for_text = this._itemHeight;

            var value_block = null;
            var value_block_size: SVGRect;
            const value = this.rankings[c].values && this.rankings[c].values[r] ? this.rankings[c].values[r] : null;
            if (value) {
                value_block = this._createTextBlock(id, value);
                value_block_size = (<SVGTextElement>value_block.node()).getBBox();
                if (this.displaySettings.showValuesOnRight)
                    width_for_text -= value_block_size.width + RankingPlot._labelHorizontalPadding;
                else
                    height_for_text -= value_block_size.height + RankingPlot._textAndValueSeparation;
            }

            var text_block = this._createTextBlock(id, this._flowLabels[id]);
            text_block.attr("x", width_for_text / 2);
            
            var pos = this._itemPosition(c, r);
            var animate = this.lastRankings != null;
            var y = pos.y;
            if (animate) {
                var start_row = this.lastRankings[c].items.indexOf(id);
                if (start_row === -1)
                    start_row = this._numRows;
                var start_pos = this._itemPosition(c, start_row);
                y = start_pos.y;
            }

            wordWrap(text_block, width_for_text - 2 * RankingPlot._labelHorizontalPadding, height_for_text);

            var text_block_size = (<SVGTextElement>text_block.node()).getBBox();
            text_block.attr("y", Math.round((height_for_text - text_block_size.height) / 2));
            text_block.attr("transform", RankingPlot._translationTransform(pos.x, y));

            if (value) {
                if (this.displaySettings.showValuesOnRight) {
                    value_block.attr("x", width_for_text + value_block_size.width / 2);
                    value_block.attr("y", Math.round(height_for_text / 2));
                } else {
                    value_block.attr("x", width_for_text / 2);
                    value_block.attr("y", Math.round((height_for_text + text_block_size.height + value_block_size.height) / 2
                        + RankingPlot._textAndValueSeparation));
                }
                value_block.attr("transform", RankingPlot._translationTransform(pos.x, y));
            }
            
            if (animate)
                text_block.transition()
                    .duration(this.displaySettings.animationDuration)
                    .attr("transform", RankingPlot._translationTransform(pos.x, pos.y));
        }

        private _createTextBlock(id: string, value: string) {
            var block = this._plot.append("text")
                .attr("flow-id", id)
                .attr("dy", ".35em")
                .attr("text-anchor", "middle")
                .attr("pointer-events", "none") // Ignore events so mouseover works on flows.
                .text(value);
            this._flowLabelStyle(id).applyTo(block);
            return block;
        }

        private static _translationTransform(x: number, y: number): string {
            return "translate(" + x + "," + y + ")";
        }

        private _renderPreviousPath(flow: Flow) {
            var prev = this._matchFlow(flow, this.lastRankings);
            return this._renderFlowPath(prev.items);
        }

        /** Render equality indicators for one ranked item. */
        private _renderEqualityIndicators(col: number, row: number) {
            var ties = this.rankings[col].ties;
            var item_rect = this._itemRect(col, row);
            if (contains(ties, row - 1))
                this._renderEqualityBar(col, row, row - 1);
            if (contains(ties, row))
                this._renderEqualityBar(col, row, row + 1);
        }

        /**
         * Add an SVG node to draw a bar near the top of the item
         * to indicate that has rank equal to the item above it.
         */
        private _renderEqualityBar(col: number, row: number, adjacentRow: number): void {
            // Determine coordinates of rectangle.
            var pos = this._itemPosition(col, row);
            var inset = this._equalityIndicatorInset;
            var x = pos.x + (this._itemWidth - this._equalityIndicatorWidth) / 2;
            // Position at top or bottom of bar.
            var offset = adjacentRow < row ? inset : this._itemHeight - inset - this._equalityIndicatorHeight;
            var y = pos.y + offset;

            var adjacent_id = this._getId(col, adjacentRow);
            // Default the colour to that of the ajacent flow.
            var colour = this._chooseEqualityBarColour(this._getId(col, row), adjacent_id);

            var animate = this.lastRankings != null;
            
            var node = this._plot.append("rect");

            // If animating, set opacity to 0 until after animation completes.
            if (animate)
                node.style("opacity", 0);

            node.attr('flow-id', adjacent_id)
                .attr('flow-colour', colour)    // used to restore colour after hilight
                .attr("x", x)
                .attr("y", y)
                .attr("width", this._equalityIndicatorWidth.toFixed())
                .attr("height", this._equalityIndicatorHeight.toFixed())
                .attr("fill", colour)
                .attr("stroke", "none")
                // Ignore events so mouseover works on underlying flows.
                .attr('pointer-events', 'none');

            if (animate)
                // Wait until animation has finished and then set the opacity to 1.
                node.transition()
                    .delay(this.displaySettings.animationDuration)
                    .style("opacity", 1);
        }

        private _chooseEqualityBarColour(id: string, adjacentId: string) {
            // Default the colour to that of the ajacent flow.
            var colour = this._flowColour(adjacentId);
            // If the adjacent flow has the same colour as this one, choose a different colour for the equals bar.
            if (colour == this._flowColour(id)) {
                colour = colour === '#A5A5A5' ? '#636363' : '#A5A5A5';
            }
            return colour;
        }

        private _columnLabelStyle(column: number): SVG.FontStyle {
            var override = this.displaySettings.labelStyleOverrides[column];
            return override ? override : this.displaySettings.columnLabelStyle;
        }

        private _flowLabelStyle(flow_id: string) : SVG.FontStyle {
            var override = this.displaySettings.flowStyleOverrides[flow_id];
            return override ? override : this.displaySettings.itemStyle;
        }

        /** Add the SVG for numbers down the left side of the plot. */
        private _renderRankNumbers() {
            var labels = this._body.append("g");
            this._numberWidth = 0;
            var num_rows = this._numRows;
            if (num_rows == 0)
                return;
            // Don't know height at this stage. Number positions will be adjusted later when height is known.
            var height = 100;
            for (var r = 0; r < num_rows; ++r) {
                var text_node = labels.append("text")
                    .attr("x", 0)
                    .attr("dy", ".35em")
                    .attr("y", r * height + height / 2)
                    .attr("text-anchor", "end")
                    .text((r + 1) + ".");
                this.displaySettings.numberStyle.applyTo(text_node);
            }
            // Update the positions of the labels now that the width of the widest number is known.
            var box = (<SVGGElement>labels.node()).getBBox();
            var width = box.width;
            var padding = this.displaySettings.horizontalPadding;
            labels.selectAll('text').attr("x", width + padding);
            this._numberWidth = width + 2 * padding;
            var node = labels.node();
            this._rankNumbers = labels;
        }

        /** Calculate height of items and plot. */
        private _calculateHeights() {
            var plot_height = this.displaySettings.height - (this._columnLabelHeight + this._titleHeight);
            if (plot_height < 0)
                plot_height = 0;
            this._plotHeight = plot_height;
            this._itemHeight = plot_height / this._numRows;
        }

        /**
         * Calculate width of items, spacing and gap.
         * Render numbers and axis labels before calling this method so that sizes are correct.
         */
        private _calculateWidths() {
            var plot_width = this.displaySettings.width - (this._numberWidth + this._yAxisLabelWidth);
            var gap_proportion = this.displaySettings.gapProportion;

            // Calculate item_width and gap so that gap === item_width * gap_proportion.
            var num_columns = this.rankings.length;
            this._itemWidth = plot_width / (num_columns + (num_columns - 1) * gap_proportion);
            this._gap = this._itemWidth * gap_proportion;
            this._horizontalSpacing = this._itemWidth + this._gap;
        }

        /**
         * Updates positions of row numbers to take into account the column and chart labels.
         */
        private _repositionNumbers() {
            // Now that the sizes y axis labels are known,
            // we can calculate the heights of the items in the plot.
            this._calculateHeights();

            var numbers = d3.selectAll(this._rankNumbers.node().childNodes);
            numbers.attr('y', (d, r) => r * this._itemHeight + this._itemHeight / 2);

            // Move rank numbers so they are lined up with the plot.
            this._rankNumbers.attr("transform", "translate(" + this._yAxisLabelWidth.toFixed() + "," + (this._columnLabelHeight + this._titleHeight).toFixed() + ")");
        }

        /** Group ranked items into flows */
        private _findFlows(): Flow[] {
            var rankings = this.rankings;

            // Get the rank for each item.
            var ranks: IRankMap[] = [];
            for (var r = 0; r < rankings.length; r++) {
                var rank: IRankMap = {};
                var items = rankings[r].items;
                for (var i = 0; i < items.length; i++) {
                    rank[items[i]] = i;
                }
                ranks[r] = rank;
            }

            var flows: Flow[] = [];
            for (var item in this._flowLabels) {
                var newFlows = RankingPlot._traceFlows(item, ranks);
                flows = flows.concat(newFlows);
            }
            // Add temporary flows that are disappearing.
            if (this.lastRankings !== null) {

            }
            return flows;
        }

        private _matchFlow(flow: Flow, rankings: Ranking[]): Flow {
            var positions = flow.items.map(item => {
                var ranks = rankings[item.col];
                var row = ranks.items.indexOf(flow.id);
                if (row === -1)
                    row = this._numRows;
                return { row: row, col: item.col };
            });
            return new Flow(flow.id, positions);
        }

        /** Find all flows for a single coordinate id. */
        private static _traceFlows(itemId: string, ranks: IRankMap[]): Flow[] {
            var flows: Flow[] = [];
            var flow: IRankingPosition[] = [];
            for (var i = 0; i < ranks.length; i++) {
                var rank = ranks[i];
                if (rank[itemId] !== undefined) {
                    flow.push({ col: i, row: rank[itemId] });
                    rank[itemId] = null;
                } else if (flow.length !== 0) {
                    flows.push(new Flow(itemId, flow));
                    flow = [];
                }
            }
            // If we found a flow, add it to the list.
            if (flow.length !== 0)
                flows.push(new Flow(itemId, flow));
            return flows;
        }

        /** Sort the flows in an array.
         *  Flows are sorted by comparing the leftmost items of each flow.
         *  Flows are ordered from left to right. Flows that start in the same column are ordered from top to bottom. */
        private static _sort(flows: Flow[]) {
            var comparator = (flow1: Flow, flow2: Flow) => {
                // If the flows start in the same column, then the top one is rendered first,
                // otherwise the flow that starts in the leftmost column is rendered first.
                var diff = flow1.items[0].col - flow2.items[0].col;
                return diff !== 0 ? diff : flow1.items[0].row - flow2.items[0].row;
            };
            flows.sort(comparator);
        }

        /** Get the colour to draw the flow for a specified item. */
        private _flowColour(item_id: string): string {
            return this.displaySettings.colourMap[item_id];
        }

        /** Get the id of the data point in the flow at a specified position in the plot */
        private _getId(col: number, row: number): string {
            var rankings = this.rankings;
            if (col >= rankings.length)
                return undefined;
            var ranking = rankings[col];
            return ranking.items[row] || undefined;
        }

        private _itemRect(col: number, row: number): Rectangle {
            var pos = this._itemPosition(col, row);
            return new Rectangle(pos.x, pos.y, this._itemWidth, this._itemHeight);
        }

        /** Top left corner of flow item, relative to plot area (not including any axis labels) */
        private _itemPosition(col: number, row: number): Point {
            return new Point(this._horizontalSpacing * col, this._itemHeight * row);
        }

        /**
         * If there is no width or height set,
         * calculate displaySettings.width and displaySettings.height.
         */
        private _estimateSize(): void {
            var width = this.displaySettings.width || 0;
            var height = this.displaySettings.height || 0;

            if (width == 0) {
                var item_width = 80;
                // Size of gap between columns
                var gap = item_width * this.displaySettings.gapProportion;

                // Initialize width to total width of columns.
                var width = this.rankings.length * item_width;
                // Add size of gaps between columns.
                if (this.rankings.length > 1)
                    width += gap * (this.rankings.length - 1);

                // Leave room for number labels.
                width += 30;
                
                // Add axis labels.
                if (this.displaySettings.showAxisLabels)
                    width += 40;

                // Set overall width of plot including axis labels etc.
                // Widths of individual items are calculated later when titles and labels are rendered.
                this.displaySettings.width = width;
            }
            if (height == 0) {
                // Nominal height for ranked items.
                var item_height = 40;
                // Initialize height to height of plot.
                height = item_height * this._numRows;
                if (this._showTitle())
                    height += 40;
                
                // Add space for column labels.
                height += 40;

                // Add space for axis labels.
                if (this.displaySettings.showAxisLabels)
                    height += 40;

                // Set overall height of plot. Heights of parts of the plot are calculated later.
                this.displaySettings.height = height;
            }
        }

        /** Returns true if the plot has a title and showAxisLabels is true. */
        private _showTitle(): boolean {
            return this.title && this.displaySettings.showAxisLabels;
        }

        /** Returns true if the plot has a y axis label and showAxisLabels is true. */
        private _showYAxisLabel(): boolean {
            return this.yAxisLabel && this.displaySettings.showAxisLabels;
        }
    }

}
