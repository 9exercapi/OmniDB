var v_createMonitorDashboardTabFunction = function() {

  // Removing last tab of the inner tab list
  v_connTabControl.selectedTab.tag.tabControl.removeLastTab();

  // Creating console tab in the inner tab list
  var v_tab = v_connTabControl.selectedTab.tag.tabControl.createTab({
    p_name: '<i class="fas fa-chart-bar fa-light"></i><span id="tab_title"> Monitoring</span>',
    p_selectFunction: function() {
      if(this.tag != null) {
        refreshHeights();
        refreshMonitorUnitsObjects();
        if (this.tag.unit_list_grid!=null) {
          showMonitorUnitList();
        }
      }
    },
    p_closeFunction: function(e,p_tab) {
      var v_current_tab = p_tab;
      beforeCloseTab(e,
        function() {
          closeMonitorDashboardTab(v_tab);
          if (v_tab.tag.tabCloseFunction)
            v_tab.tag.tabCloseFunction(v_tab.tag);
        });
    },
    p_dblClickFunction: renameTab
  });

  v_connTabControl.selectedTab.tag.tabControl.selectTab(v_tab);

  var v_html =
  "<button class='btn btn-secondary btn-sm my-1 mr-1' onclick='refreshMonitorDashboard(true)'>Refresh All</button>" +
  "<button class='btn btn-secondary btn-sm my-1' onclick='showMonitorUnitList()'>Manage Units</button>" +
  "<div id='dashboard_" + v_tab.id + "' class='dashboard_all row'></div>";

  var v_div = document.getElementById('div_' + v_tab.id);
  v_div.innerHTML = v_html;

  var v_txt_snippet = document.getElementById('txt_snippet_' + v_tab.id);

  var v_tag = {
    tab_id: v_tab.id,
    mode: 'monitor_dashboard',
    dashboard_div: document.getElementById('dashboard_' + v_tab.id),
    unit_list_div: document.getElementById('unit_list_div_' + v_tab.id),
    unit_list_grid_div: document.getElementById('unit_list_grid_' + v_tab.id),
    unit_list_grid: null,
    unit_list_id_list: [],
    tabControl: v_connTabControl.selectedTab.tag.tabControl,
    units: [],
    unit_sequence: 0,
    tab_active: true,
    connTabTag: v_connTabControl.selectedTab.tag,
    tabCloseFunction: function(p_tag) {
      for (var i=0; i<p_tag.units.length; i++) {
        try {
          p_tag.units[i].object.destroy();
        }
        catch(err) {
        }
      }
    }
  };

  v_tab.tag = v_tag;

  // Creating + tab in the outer tab list
  var v_add_tab = v_connTabControl.selectedTab.tag.tabControl.createTab(
    {
      p_name: '+',
      p_close: false,
      p_selectable: false,
      p_clickFunction: function(e) {
        showMenuNewTab(e);
      }
    });
  v_add_tab.tag = {
    mode: 'add'
  }

  setTimeout(function() {
    refreshHeights();
  },10);

};

var v_createNewMonitorUnitTabFunction = function() {

  // Removing last tab of the inner tab list
  v_connTabControl.selectedTab.tag.tabControl.removeLastTab();

  // Creating console tab in the inner tab list
  var v_tab = v_connTabControl.selectedTab.tag.tabControl.createTab({
    p_name: '<i class="fas fa-align-left fa-light"></i><span id="tab_title"> Monitor Unit</span>',
    p_selectFunction: function() {
      if(this.tag != null) {
        refreshHeights();
      }
      if(this.tag != null && this.tag.editor != null) {
          this.tag.editor.focus();
      }
    },
    p_closeFunction: function(e,p_tab) {
      var v_current_tab = p_tab;
      beforeCloseTab(e,
        function() {
          removeTab(v_current_tab);
          if (v_tab.tag.tabCloseFunction)
            v_tab.tag.tabCloseFunction(v_tab.tag);
        });
    },
    p_dblClickFunction: renameTab
  });

  v_connTabControl.selectedTab.tag.tabControl.selectTab(v_tab);

  var v_html =
  '<button class="btn btn-secondary btn-sm my-1 mr-1" onclick="testMonitorScript()">Test</button>' +
  '<button class="btn btn-secondary btn-sm my-1" onclick="saveMonitorScript()">Save</button>' +
  '<div class="form-row">' +
  '  <div class="col-md-3 mb-3">' +
  '    <label for="conn_form_title">Name</label>' +
  '    <input type="text" class="form-control" id="txt_unit_name_' + v_tab.id + '" placeholder="Name">' +
  '  </div>' +
  '  <div class="col-md-3 mb-3">' +
  '    <label for="conn_form_type">Type</label>' +
  '    <select id="select_type_' + v_tab.id + '" class="form-control">' +
  '      <option value="chart_append">Chart (Append)</option>' +
  '      <option value="chart">Chart (No Append)</option>' +
  '      <option value="grid">Grid</option>' +
  '      <option value="graph">Graph</option>' +
  '    </select>' +
  '  </div>' +
  '  <div class="col-md-3 mb-3">' +
  '    <label for="conn_form_title">Refresh Interval</label>' +
  '    <input type="text" class="form-control" id="txt_interval_' + v_tab.id + '" placeholder="Title">' +
  '  </div>' +
  '  <div class="col-md-3 mb-3">' +
  '    <label for="conn_form_type">Template</label>' +
  '    <select id="select_template_' + v_tab.id + '" onchange="selectUnitTemplate(this.value)" class="form-control">' +
  '      <option value=-1>Select Template</option>' +
  '    </select>' +
  '  </div>' +
  '</div>' +
  '<div class="form-row">' +
  '  <div class="col-md-6">' +
  '    <div id="txt_data_' + v_tab.id + '" style=" width: 100%; height: 250px;"></div>' +
  '  </div>' +
  '  <div class="col-md-6">' +
  '    <div id="txt_script_' + v_tab.id + '" style=" width: 100%; height: 250px;"></div>' +
  '  </div>' +
  "</div>";

  var v_div = document.getElementById('div_' + v_tab.id);
  v_div.innerHTML = v_html;

  var langTools = ace.require("ace/ext/language_tools");

  var v_txt_script = document.getElementById('txt_script_' + v_tab.id);
  var v_editor = ace.edit('txt_script_' + v_tab.id);
  v_editor.$blockScrolling = Infinity;
  v_editor.setTheme("ace/theme/" + v_editor_theme);
  v_editor.session.setMode("ace/mode/python");
  v_editor.setFontSize(Number(v_editor_font_size));
  v_editor.commands.bindKey("ctrl-space", null);
  v_editor.commands.bindKey("Cmd-,", null)
  v_editor.commands.bindKey("Ctrl-,", null)
  v_editor.commands.bindKey("Cmd-Delete", null)
  v_editor.commands.bindKey("Ctrl-Delete", null)
  v_editor.commands.bindKey("Ctrl-Up", null)
  v_editor.commands.bindKey("Ctrl-Down", null)

  var v_txt_data = document.getElementById('txt_data_' + v_tab.id);
  var v_editor_data = ace.edit('txt_data_' + v_tab.id);
  v_editor_data.$blockScrolling = Infinity;
  v_editor_data.setTheme("ace/theme/" + v_editor_theme);
  v_editor_data.session.setMode("ace/mode/python");
  v_editor_data.setFontSize(Number(v_editor_font_size));
  v_editor_data.commands.bindKey("ctrl-space", null);
  v_editor_data.commands.bindKey("Cmd-,", null)
  v_editor_data.commands.bindKey("Ctrl-,", null)
  v_editor_data.commands.bindKey("Cmd-Delete", null)
  v_editor_data.commands.bindKey("Ctrl-Delete", null)
  v_editor_data.commands.bindKey("Ctrl-Up", null)
  v_editor_data.commands.bindKey("Ctrl-Down", null)

  v_txt_script.onclick = function() {

    v_editor.focus();

  };

  var v_tag = {
    tab_id: v_tab.id,
    mode: 'monitor_unit',
    editor: v_editor,
    editor_data: v_editor_data,
    editorDiv: v_txt_script,
    editorDataDiv: v_txt_data,
    editorDivId: 'txt_script_' + v_tab.id,
    select_type: document.getElementById('select_type_' + v_tab.id),
    select_template: document.getElementById('select_template_' + v_tab.id),
    input_unit_name: document.getElementById('txt_unit_name_' + v_tab.id),
    input_interval: document.getElementById('txt_interval_' + v_tab.id),
    div_result: document.getElementById('monitoring_unit_test_result'),
    div_result_label: document.getElementById('monitoring_unit_test_legend'),
    bt_test: document.getElementById('bt_test_' + v_tab.id),
    tabControl: v_connTabControl.selectedTab.tag.tabControl,
    unit_id: null,
    object: null,
    tabCloseFunction: function(p_tag) {
      try {
        p_tag.object.destroy();
      }
      catch(err) {
      }
    }
  };

  v_tab.tag = v_tag;

  // Creating + tab in the outer tab list
  var v_add_tab = v_connTabControl.selectedTab.tag.tabControl.createTab(
    {
      p_name: '+',
      p_close: false,
      p_selectable: false,
      p_clickFunction: function(e) {
        showMenuNewTab(e);
      }
    });
  v_add_tab.tag = {
    mode: 'add'
  }

  setTimeout(function() {
    refreshHeights();
  },10);

};
