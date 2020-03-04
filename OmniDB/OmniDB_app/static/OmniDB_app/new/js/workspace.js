/// <summary>
/// Startup function.
/// </summary>
$(function () {

  // Instantiating outer tab component
  v_connTabControl = createTabControl({
    p_div: 'omnidb_main_tablist'
  });
  // Objects to control sequential change of active database tabs
  v_connTabControl.tag.change_active_database_call_list = [];
  v_connTabControl.tag.change_active_database_call_running = false;

  // Creating first tab of the outer tab
  v_connTabControl.createTab(
    {
      p_name: '+',
      p_close: false,
      p_selectable: false,
      p_clickFunction: function(e) {
        showMenuNewTabOuter(e);
    }
  });

  // Instantiating functions responsible for creating all the different types
  // of tabs
  initCreateTabFunctions();

  // Retrieving database list
  getDatabaseList(true);

  startQueryWebSocket();

});

/// <summary>
/// Retrieves database list.
/// </summary>
function getDatabaseList(p_init, p_callback) {

	execAjax('/get_database_list/',
			JSON.stringify({}),
			function(p_return) {

				v_connTabControl.tag.connections = p_return.v_data.v_connections;

				v_connTabControl.tag.groups = p_return.v_data.v_groups;
				v_connTabControl.tag.remote_terminals = p_return.v_data.v_remote_terminals;

				if (p_init) {

					if (v_connTabControl.tag.connections.length>0) {

						//Create existing tabs
						var v_current_parent = null;
						var v_has_old_tabs = false;
						if (p_return.v_data.v_existing_tabs.length>0)
							v_has_old_tabs = true;

						for (var i=0; i < p_return.v_data.v_existing_tabs.length; i++) {
							if (v_current_parent == null || v_current_parent != p_return.v_data.v_existing_tabs[i].index) {
                startLoading();
								v_connTabControl.tag.createConnTab(p_return.v_data.v_existing_tabs[i].index,false);
								v_connTabControl.tag.createConsoleTab();
							}

							v_current_parent = p_return.v_data.v_existing_tabs[i].index;
							v_connTabControl.tag.createQueryTab(p_return.v_data.v_existing_tabs[i].title,p_return.v_data.v_existing_tabs[i].tab_db_id);
					    v_connTabControl.selectedTab.tag.tabControl.selectedTab.tag.editor.setValue(
					        p_return.v_data.v_existing_tabs[i].snippet);
							v_connTabControl.selectedTab.tag.tabControl.selectedTab.tag.editor.clearSelection();
					    v_connTabControl.selectedTab.tag.tabControl.selectedTab.tag.editor.gotoLine(0, 0, true);
						}

						if (!v_has_old_tabs) {
              startLoading();
							v_connTabControl.tag.createConnTab(v_connTabControl.tag.connections[0].v_conn_id);
            }

					}
					else {/*
						var v_instance = new Tooltip($('#menu_connections'),{
					    title: 'Create your first connection!',
					    placement: "bottom",
					  });
						v_instance.show();
				    window.setTimeout(function() {
				        v_instance.dispose();
				    }, 4000);*/
					}
				}

				if (p_callback)
					p_callback();

        endLoading();

			},
			null,
			'box');
}

function queueChangeActiveDatabaseThreadSafe(p_data) {

	v_connTabControl.tag.change_active_database_call_list.push(p_data);
	if (!v_connTabControl.tag.change_active_database_call_running) {
		changeActiveDatabaseThreadSafe(v_connTabControl.tag.change_active_database_call_list.pop());
	}
}

function changeActiveDatabaseThreadSafe(p_data) {
	v_connTabControl.tag.change_active_database_call_running = true;
	execAjax('/change_active_database/',
			JSON.stringify(p_data),
			function(p_return) {
				v_connTabControl.tag.change_active_database_call_running = false;
				if (v_connTabControl.tag.change_active_database_call_list.length>0)
					changeActiveDatabaseThreadSafe(v_connTabControl.tag.change_active_database_call_list.pop());
			},
			null,
			'box');
}

/// <summary>
/// Changing database in the current connection tab.
/// </summary>
function changeDatabase(p_value) {

  v_connTabControl.selectedTab.tag.divDetails.innerHTML = '';

  //finding connection object
  var v_conn_object = null;
  for (var i=0; i<v_connTabControl.tag.connections.length; i++) {
  	if (p_value==v_connTabControl.tag.connections[i].v_conn_id) {
  		v_conn_object = v_connTabControl.tag.connections[i];
  		break;
  	}
  }
  if (!v_conn_object)
  	v_conn_object = v_connTabControl.tag.connections[0];

  v_connTabControl.selectedTab.tag.selectedDatabaseIndex = parseInt(p_value);
  v_connTabControl.selectedTab.tag.selectedDBMS = v_conn_object.v_db_type;
  v_connTabControl.selectedTab.tag.consoleHelp = v_conn_object.v_console_help;
  v_connTabControl.selectedTab.tag.selectedDatabase = v_conn_object.v_database;
  v_connTabControl.selectedTab.tag.selectedTitle = v_conn_object.v_alias;

  if (v_connTabControl.selectedTab.tag.selectedTitle!='')
  	v_connTabControl.selectedTab.tag.tabTitle.innerHTML = '<img src="' + v_url_folder + '/static/OmniDB_app/images/' + v_connTabControl.selectedTab.tag.selectedDBMS + '_medium.png"/> ' + v_connTabControl.selectedTab.tag.selectedTitle + ' - ' + v_connTabControl.selectedTab.tag.selectedDatabase;
  else
  	v_connTabControl.selectedTab.tag.tabTitle.innerHTML = '<img src="' + v_url_folder + '/static/OmniDB_app/images/' + v_connTabControl.selectedTab.tag.selectedDBMS + '_medium.png"/> ' + v_connTabControl.selectedTab.tag.selectedDatabase;


  queueChangeActiveDatabaseThreadSafe({
  		"p_database_index": v_connTabControl.selectedTab.tag.selectedDatabaseIndex,
  		"p_tab_id": v_connTabControl.selectedTab.id,
  		"p_database": v_connTabControl.selectedTab.tag.selectedDatabase
  });

  if (v_conn_object.v_db_type=='postgresql')
  	getTreePostgresql(v_connTabControl.selectedTab.tag.divTree.id);
    else if (v_conn_object.v_db_type=='oracle')
  	getTreeOracle(v_connTabControl.selectedTab.tag.divTree.id);
    else if (v_conn_object.v_db_type=='mysql')
  	getTreeMysql(v_connTabControl.selectedTab.tag.divTree.id);
    else if (v_conn_object.v_db_type=='mariadb')
  	getTreeMariadb(v_connTabControl.selectedTab.tag.divTree.id);

}

/// <summary>
/// Check if there are troublesome tabs
/// </summary>
/// <param name="p_cancel_function">Ok function.</param>
/// <param name="p_ok_function">Cancel function.</param>
function checkBeforeChangeDatabase(p_cancel_function, p_ok_function) {
	for (var i=0; i < v_connTabControl.selectedTab.tag.tabControl.tabList.length; i++) {

		var v_tab = v_connTabControl.selectedTab.tag.tabControl.tabList[i];
		if (v_tab.tag!=null)
			if (v_tab.tag.mode=='edit' || v_tab.tag.mode=='alter' || v_tab.tag.mode=='debug' || v_tab.tag.mode=='monitor_dashboard' || v_tab.tag.mode=='data_mining') {
				showAlert('Before changing connection please close any tab that belongs to the following types: <br/><br/><b>Edit Data<br/><br/>Alter Table<br/><br/>Function Debugging<br/><br/>Monitoring Dashboard<br/><br/>Advanced Object Search');
				v_connTabControl.selectedTab.tag.dd_object.set("selectedIndex",v_connTabControl.selectedTab.tag.dd_selected_index);
				if (p_cancel_function!=null)
					p_cancel_function();
				return null;
			}
	}
	if (p_ok_function!=null)
		p_ok_function();
}

/// <summary>
/// Rename tab.
/// </summary>
function renameTab(p_tab) {

	showConfirm('<input id="tab_name"/ class="form-control" value="' + p_tab.tag.tab_title_span.innerHTML + '" style="width: 100%;">',
        function() {
					renameTabConfirm(p_tab,document.getElementById('tab_name').value);
        },
        null,
        function() {
          var v_input = document.getElementById('tab_name');
          v_input.focus();
          v_input.selectionStart = v_input.selectionEnd = 10000;
        });
	var v_input = document.getElementById('tab_name');
	v_input.onkeydown = function() {
		if (event.keyCode == 13)
			document.getElementById('modal_message_ok').click();
		else if (event.keyCode == 27)
			document.getElementById('modal_message_cancel').click();
	}

}

/// <summary>
/// Renames tab.
/// </summary>
function renameTabConfirm(p_tab, p_name) {

	p_tab.tag.tab_title_span.innerHTML=p_name;

}

/// <summary>
/// Removes tab.
/// </summary>
function removeTab(p_tab) {

	if (p_tab.tag.ht!=null) {
		p_tab.tag.ht.destroy();
		p_tab.tag.div_result.innerHTML = '';
	}

	if (p_tab.tag.editor!=null)
		p_tab.tag.editor.destroy();

	if (p_tab.tag.mode=='query' || p_tab.tag.mode=='edit' || p_tab.tag.mode=='console' || p_tab.tag.mode=='outer_terminal') {
		var v_message_data = { tab_id: p_tab.tag.tab_id, tab_db_id: null };
		if (p_tab.tag.mode=='query')
			v_message_data.tab_db_id = p_tab.tag.tab_db_id;

		sendWebSocketMessage(v_queryWebSocket, v_queryRequestCodes.CloseTab, [v_message_data], false, null);
	}
	p_tab.removeTab();

}

function resizeWindow(){
	refreshHeights(true);

}

var resizeTimeout;
$(window).resize(function() {
	clearTimeout(resizeTimeout);
	resizeTimeout = setTimeout(resizeWindow, 200);
});

/// <summary>
/// Refresh divs sizes and components of the currently selected tab
/// </summary>
function refreshHeights(p_all) {

	//Adjusting tree height
	if (p_all) {
		refreshTreeHeight();
	}

	if (v_connections_data && v_connections_data.v_active) {
		v_connections_data.ht.render();
	}

	if (v_connTabControl.selectedTab.tag.mode=='monitor_all') {
		v_connTabControl.selectedTab.tag.tabControlDiv.style.height = window.innerHeight - $(v_connTabControl.selectedTab.tag.tabControlDiv).offset().top - 18 + 'px';
	}
	else if (v_connTabControl.selectedTab.tag.mode=='outer_terminal') {
		v_connTabControl.selectedTab.tag.div_console.style.height = window.innerHeight - $(v_connTabControl.selectedTab.tag.div_console).offset().top - 10 + 'px';
		v_connTabControl.selectedTab.tag.editor_console.fit();

	}

	//If inner tab exists
	if (v_connTabControl.selectedTab.tag.tabControl != null && v_connTabControl.selectedTab.tag.tabControl.selectedTab) {
		var v_tab_tag = v_connTabControl.selectedTab.tag.tabControl.selectedTab.tag;

		//Snippet tab, adjust editor only
		if (v_tab_tag.mode=='snippet') {
			v_tab_tag.editorDiv.style.height = window.innerHeight - $(v_tab_tag.editorDiv).offset().top - 42 + 'px';
			v_tab_tag.editor.resize();
		}
		else if (v_tab_tag.mode=='monitor_unit') {
			var v_new_height = window.innerHeight - $(v_tab_tag.editorDataDiv).offset().top - 12 + 'px';
			v_tab_tag.editorDiv.style.height = v_new_height;
			v_tab_tag.editorDataDiv.style.height = v_new_height;
			v_tab_tag.editor.resize();
			v_tab_tag.editor_data.resize();
		}
		else if (v_tab_tag.mode=='query') {
			if (v_tab_tag.currQueryTab=='data') {
				v_tab_tag.div_result.style.height = window.innerHeight - $(v_tab_tag.div_result).offset().top - 15 + 'px';
				if (v_tab_tag.ht!=null)
					v_tab_tag.ht.render();
				if(v_tab_tag.editor != null)
						v_tab_tag.editor.resize();
			}
			else if (v_tab_tag.currQueryTab=='message') {
				v_tab_tag.div_notices.style.height = window.innerHeight - $(v_tab_tag.div_notices).offset().top - 15 + 'px';
			}
			else if (v_tab_tag.currQueryTab=='explain') {
				v_tab_tag.div_explain.style.height = window.innerHeight - $(v_tab_tag.div_explain).offset().top - 15 + 'px';
			}
		}
		else if (v_tab_tag.mode=='console') {
			v_tab_tag.div_console.style.height = window.innerHeight - $(v_tab_tag.div_console).offset().top - parseInt(v_tab_tag.div_result.style.height,10) - 59 + 'px';
			v_tab_tag.editor_console.resize();
			v_tab_tag.editor_input.resize();

		}
		else if (v_tab_tag.mode=='debug') {
			if (v_tab_tag.currDebugTab=='variable') {
				v_tab_tag.div_variable.style.height = window.innerHeight - $(v_tab_tag.div_variable).offset().top - 15 + 'px';
				if (v_tab_tag.htVariable!=null)
					v_tab_tag.htVariable.render();
			}
			else if (v_tab_tag.currDebugTab=='parameter') {
				v_tab_tag.div_parameter.style.height = window.innerHeight - $(v_tab_tag.div_parameter).offset().top - 15 + 'px';
				if (v_tab_tag.htParameter!=null)
					v_tab_tag.htParameter.render();
			}
			else if (v_tab_tag.currDebugTab=='result') {
				v_tab_tag.div_result.style.height = window.innerHeight - $(v_tab_tag.div_result).offset().top - 15 + 'px';
				if (v_tab_tag.htResult!=null)
					v_tab_tag.htResult.render();
			}
			else if (v_tab_tag.currDebugTab=='message') {
				v_tab_tag.div_notices.style.height = window.innerHeight - $(v_tab_tag.div_notices).offset().top - 15 + 'px';
			}
			else if (v_tab_tag.currDebugTab=='statistics') {
				v_tab_tag.div_statistics.style.height = window.innerHeight - $(v_tab_tag.div_statistics).offset().top - 15 + 'px';
				if (v_tab_tag.chart!=null)
					v_tab_tag.chart.update();
			}
		}
		else if (v_tab_tag.mode=='monitor_grid') {
			v_tab_tag.div_result.style.height = window.innerHeight - $(v_tab_tag.div_result).offset().top - 21 + 'px';
			if (v_tab_tag.ht!=null)
				v_tab_tag.ht.render();
		}
		else if (v_tab_tag.mode=='query_history') {
			v_tab_tag.div_result.style.height = window.innerHeight - $(v_tab_tag.div_result).offset().top - 21 + 'px';
			if (v_tab_tag.ht!=null)
				v_tab_tag.ht.render();
		}
		else if (v_tab_tag.mode=='graph') {
			v_tab_tag.graph_div.style.height = window.innerHeight - $(v_tab_tag.graph_div).offset().top - 10 + "px";

		}
		else if (v_tab_tag.mode=='website') {
			v_tab_tag.iframe.style.height = window.innerHeight - $(v_tab_tag.iframe).offset().top - 10 + "px";
		}
		else if (v_tab_tag.mode=='website_outer') {
			v_tab_tag.iframe.style.height = window.innerHeight - $(v_tab_tag.iframe).offset().top - 10 + "px";
		}
		else if (v_tab_tag.mode=='edit') {
			v_tab_tag.div_result.style.height = window.innerHeight - $(v_tab_tag.div_result).offset().top - 10 + 'px';
			if (v_tab_tag.editDataObject.ht!=null) {
				v_tab_tag.editDataObject.ht.render();
			}
		}
		else if (v_tab_tag.mode=='monitor_dashboard') {
			v_tab_tag.dashboard_div.style.height = window.innerHeight - $(v_tab_tag.dashboard_div).offset().top - $(v_tab_tag.dashboard_div.parentElement).scrollTop() - 10 + "px";
		}
		else if (v_tab_tag.mode=='alter') {
			if (v_tab_tag.alterTableObject.window=='columns') {
				var v_height = window.innerHeight - $(v_tab_tag.htDivColumns).offset().top - 45;
				v_tab_tag.htDivColumns.style.height = v_height + 'px';
				if (v_tab_tag.alterTableObject.htColumns!=null) {
					v_tab_tag.alterTableObject.htColumns.render();
				}
			}
			else if (v_tab_tag.alterTableObject.window=='constraints') {
				var v_height = window.innerHeight - $(v_tab_tag.htDivConstraints).offset().top - 45;
				v_tab_tag.htDivConstraints.style.height = v_height + 'px';
				if (v_tab_tag.alterTableObject.htConstraints!=null) {
					v_tab_tag.alterTableObject.htConstraints.render();
				}
			}
			else {
				var v_height = window.innerHeight - $(v_tab_tag.htDivIndexes).offset().top - 45;
				v_tab_tag.htDivIndexes.style.height = v_height + 'px';
				if (v_tab_tag.alterTableObject.htIndexes!=null) {
					v_tab_tag.alterTableObject.htIndexes.render();
				}
			}
		}
		else if(v_tab_tag.mode == 'data_mining') {
			if(v_tab_tag.currQueryTab == 'data') {
				v_tab_tag.div_result.style.height = window.innerHeight - $(v_tab_tag.div_result).offset().top - 15 + 'px';
			}
		}
	}

	//Hooks
  if (v_connTabControl.tag.hooks.windowResize.length>0) {
    for (var i=0; i<v_connTabControl.tag.hooks.windowResize.length; i++)
      v_connTabControl.tag.hooks.windowResize[i]();
  }

}

function refreshTreeHeight() {
  var v_tag = v_connTabControl.selectedTab.tag;

	if (v_tag.currTreeTab=='properties') {
		var v_height  = window.innerHeight - $(v_tag.divProperties).offset().top - 8;
		v_tag.divProperties.style.height = v_height + "px";
		v_tag.gridProperties.render();
	}
	else if (v_tag.currTreeTab=='ddl') {
		var v_height  = window.innerHeight - $(v_tag.divDDL).offset().top - 8;
		v_tag.divDDL.style.height = v_height + "px";
		v_tag.ddlEditor.resize();
	}
	else if (v_tag.mode=='snippets') {
		var v_height  = window.innerHeight - $(v_tag.divTree).offset().top;
		v_tag.divTree.style.height = v_height + "px";
	}

}

function checkTabStatus(v_tab) {

	if (v_tab.tag.tabControl.selectedTab.tag.mode=='query')
		checkQueryStatus(v_tab.tag.tabControl.selectedTab);
	else if (v_tab.tag.tabControl.selectedTab.tag.mode=='edit')
		checkEditDataStatus(v_tab.tag.tabControl.selectedTab);
	else if (v_tab.tag.tabControl.selectedTab.tag.mode=='debug')
		checkDebugStatus(v_tab.tag.tabControl.selectedTab);
	else if (v_tab.tag.tabControl.selectedTab.tag.mode=='console')
		checkConsoleStatus(v_tab.tag.tabControl.selectedTab);

}

function showMenuNewTabOuter(e) {

	var v_option_list = [];
	//Hooks
	if (v_connTabControl.tag.hooks.outerTabMenu.length>0) {
		for (var i=0; i<v_connTabControl.tag.hooks.outerTabMenu.length; i++)
			v_option_list = v_option_list.concat(v_connTabControl.tag.hooks.outerTabMenu[i]());
	}

	if (v_show_terminal_option)
		v_option_list.push({
			text: 'Local Terminal',
			icon: 'fas cm-all fa-terminal',
			action: function() {
				v_connTabControl.tag.createOuterTerminalTab();
			}
		});

		//building connection list
		if (v_connTabControl.tag.connections.length>0) {

			// No custom groups, render all connections in the same list
			if (v_connTabControl.tag.groups.length==1) {
				var v_submenu_connection_list = []

				for (var i=0; i<v_connTabControl.tag.connections.length; i++) (function(i){
					var v_conn = v_connTabControl.tag.connections[i];
					v_submenu_connection_list.push({
						text: v_conn.v_details1 + ' - ' + v_conn.v_details2,
						icon: 'fas cm-all node-' + v_conn.v_db_type,
						action: function() {
								v_connTabControl.tag.createConnTab(v_conn.v_conn_id);
						}
					});
				})(i);

				v_option_list.push({
					text: 'Connections',
					icon: 'fas cm-all fa-plug',
					submenu: {
							elements: v_submenu_connection_list
					}
				});
			}
			//Render connections split in groups
			else {

				var v_group_list = [];

				for (var i=0; i<v_connTabControl.tag.groups.length; i++) (function(i){
					var v_current_group = v_connTabControl.tag.groups[i];

					var v_group_connections = [];

					//First group, add all connections
					if (i==0) {
						for (var k=0; k<v_connTabControl.tag.connections.length; k++) (function(k){
							var v_conn = v_connTabControl.tag.connections[k];
							v_group_connections.push({
								text: v_conn.v_details1 + ' - ' + v_conn.v_details2,
								icon: 'fas cm-all node-' + v_conn.v_db_type,
								action: function() {
                  startLoading();
                  setTimeout(function() { v_connTabControl.tag.createConnTab(v_conn.v_conn_id); },0);
								}
							});
						})(k);

					}
					else {
						for (var j=0; j<v_current_group.conn_list.length; j++) {

							//Search corresponding connection to use its data
							for (var k=0; k<v_connTabControl.tag.connections.length; k++) (function(k){
								var v_conn = v_connTabControl.tag.connections[k];
								if (v_conn.v_conn_id==v_current_group.conn_list[j]) {
									v_group_connections.push({
										text: v_conn.v_details1 + ' - ' + v_conn.v_details2,
										icon: 'fas cm-all node-' + v_conn.v_db_type,
										action: function() {
                        startLoading();
                				setTimeout(function() { v_connTabControl.tag.createConnTab(v_conn.v_conn_id); },0);
										}
									});
									return;
								}
							})(k);

						}
					}

					var v_group_data = {
						text: v_current_group.v_name,
						icon: 'fas cm-all fa-plug',
						submenu: {
								elements: v_group_connections
						}
					}

					v_group_list.push(v_group_data);

				})(i);

				v_option_list.push({
					text: 'Connections',
					icon: 'fas cm-all fa-plug',
					submenu: {
							elements: v_group_list
					}
				});

			}
	}

	if (v_connTabControl.tag.remote_terminals.length>0) {

		var v_submenu_terminal_list = []

		for (var i=0; i<v_connTabControl.tag.remote_terminals.length; i++) (function(i){
			var v_term = v_connTabControl.tag.remote_terminals[i];
			v_submenu_terminal_list.push({
				text: v_term.v_alias,
				icon: 'fas cm-all fa-terminal',
				action: function() {
						v_connTabControl.tag.createOuterTerminalTab(v_term.v_conn_id,v_term.v_alias);
				}
			});
		})(i);

		v_option_list.push({
			text: 'SSH Consoles',
			icon: 'fas cm-all fa-terminal',
			submenu: {
					elements: v_submenu_terminal_list
			}
		});
}



	if (v_option_list.length>0) {
		v_option_list.unshift({
			text: 'New Connection',
			icon: 'fas cm-all fa-plug',
			action: function() {
				startLoading();
				setTimeout(function() { v_connTabControl.tag.createConnTab(); },0);
			}
		});

		customMenu(
			{
				x:e.clientX+5,
				y:e.clientY+5
			},
			v_option_list,
			null);
	}
	else {
		startLoading();
		setTimeout(function() { v_connTabControl.tag.createConnTab(); },0);
	}

}

function showMenuNewTab(e) {
	var v_option_list = [
		{
			text: 'Query Tab',
			icon: 'fas cm-all fa-search',
			action: function() {
				v_connTabControl.tag.createQueryTab();
			}
		},
		{
			text: 'Console Tab',
			icon: 'fas cm-all fa-terminal',
			action: function() {
				v_connTabControl.tag.createConsoleTab();
			}
		}
	]

	if (v_connTabControl.selectedTab.tag.selectedDBMS=='postgresql' ||
			v_connTabControl.selectedTab.tag.selectedDBMS=='mysql' ||
			v_connTabControl.selectedTab.tag.selectedDBMS=='mariadb') {
		v_option_list.push(
			{
				text: 'Monitoring Dashboard',
				icon: 'fas cm-all fa-chart-line',
				action: function() {
					v_connTabControl.tag.createMonitorDashboardTab();
					startMonitorDashboard();
				}
			}
		);

		v_option_list.push(
			{
				text: 'Backends',
				icon: 'fas cm-all fa-tasks',
				action: function() {
					v_connTabControl.tag.createMonitoringTab(
							'Backends',
							'select * from pg_stat_activity', [{
									icon: 'fas fa-times action-grid action-close',
									title: 'Terminate',
									action: 'postgresqlTerminateBackend'
							}]);
				}
			}
		);
	}
	else if (v_connTabControl.selectedTab.tag.selectedDBMS=='mysql' || v_connTabControl.selectedTab.tag.selectedDBMS=='mariadb') {
		v_option_list.push(
			{
				text: 'Process List',
				icon: 'fas cm-all fa-tasks',
				action: function() {
					v_connTabControl.tag.createMonitoringTab(
							'Process List',
							'select * from information_schema.processlist', [{
									icon: 'fas fa-times action-grid action-close',
									title: 'Terminate',
									action: 'mysqlTerminateBackend'
							}]);
				}
			}
		);
	}

	//Hooks
	if (v_connTabControl.tag.hooks.innerTabMenu.length>0) {
		for (var i=0; i<v_connTabControl.tag.hooks.innerTabMenu.length; i++)
			v_option_list = v_option_list.concat(v_connTabControl.tag.hooks.innerTabMenu[i]());
	}

	customMenu(
		{
			x:e.clientX+5,
			y:e.clientY+5
		},
		v_option_list,
		null);

}
