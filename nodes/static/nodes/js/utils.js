/**
 * Created by jim on 12/03/14.
 * @fileOverview Utilities functions
 * @author Jaime Ibar
 * @version 0.1
*/

/**
 * Global variables.
 */
$(document).ready(function() {
    interval = null;
    bifibutton = $("#Bifi");
    cienciasbutton = $("#Ciencias");
    epshbutton = $("#EPSH");
    euptbutton = $("#EUPT");
    allbutton = $("#all");
    clearbutton = $("#clear");
    commands = $("#commands");
    gobutton = $("#go");
    stopbutton = $("#stop");
});

/**
 * Get sitename selected and build a table with the hostnames and ips
 * that belong to that site.
 * @param sname sitename
 */
function get_selected_site(sname) {
    if($("input:checkbox[name=hosts]:checked").length > 0) {
        gobutton.text("Go (0)");
        gobutton.prop("disabled", true);
        manage_commands_selector(true);
        commands.find("option[id=up]").before("<option id=empty selected></option>");
    }
    $.ajax({
        data: {
            name: sname
        },
        url: "/index",
        dataType: "json",
        success: function(data) {
            manage_clear_button(false);
            var divhostlist = $("#div_hostlist");
            if ($("#table_hosts").length != 0) {
                divhostlist.empty();
            }
            var tcontent = "<table id='table_hosts' class='table table-bordered table-hover'>" +
                "<thead><tr><th><input id='all_hosts' type='checkbox' name='all_hosts' onchange='check_all()'></th>" +
                "<th>Hostname</th><th>IP</th><th>Status</th></tr></thead><tbody></tbody></table>";
            divhostlist.append($(tcontent));
            $.each(data, function(i, item) {
                var hostname = item.fields.hostname;
                var shorthostname = hostname.split(".", 1);
                var ip = item.fields.ip;
                var content = "<tr id=" + shorthostname + "><td><input type='checkbox' name='hosts' onchange='checked_host()' value=" + shorthostname + "></td>";
                content += "<td id=" + shorthostname + "h>" + shorthostname + "</td>";
                content += "<td id=" + shorthostname + "i>" + ip + "</td>";
                content += "<td id=" + shorthostname + "s></td></tr>";
                $("#table_hosts").find("tbody:last").append($(content));
            });
        }
    });
}

/**
 * Get all hosts that are checked.
 * @returns {Array} selected_hosts The array of selected hosts
 */
function get_selected_hosts() {
    var selected_hosts = [];
    var checked_hosts = $("input:checkbox[name=hosts]:checked");
    checked_hosts.each(function() {
        selected_hosts.push($(this).val());
    });
    return selected_hosts;
}

/**
 * Clear previous results from hosts table.
 */
function clear_previous_results() {
    $(".onstatus").removeClass("onstatus").empty();
    $(".offstatus").removeClass("offstatus").empty();
}

/**
 * Get command selected by user.
 * @returns command
 */
function get_selected_command() {
    var command = commands.val();
    return command;
}

/**
 * Collects data needed for execution
 */
function do_execution() {
    var command = get_selected_command();
    var allhosts = get_selected_hosts();
    // Is there a previous execution?
    if ($(".onstatus").length > 0 || $(".offstatus").length > 0) {
        clear_previous_results();
    }
    if (command == "up" || command == "down") {
        var msg = allhosts.join("\n");
        var resp = confirm("The command will be applied to: \n" + msg + "\nAre you sure?");
        if (resp) {
            do_ipmi_execution(allhosts, command);
        }
    } else {
        do_ipmi_execution(allhosts, command);
    }
}

/**
 * Start ipmi execution
 * @param hosts List of selected hosts by user
 * @param command Ipmi command to execute in hosts
 */
function do_ipmi_execution(hosts, command) {
    manage_sites_buttons(true);
    manage_commands_selector(true);
    manage_clear_button(true);
    manage_go_button();
    $("body").css("cursor", "progress");
    $.ajax({
        type: "GET",
        url: "/index",
        dataType: "json",
        data: {
            selectedhosts: hosts,
            cmd: command
        },
        traditional: true,
        success: function(data) {
            if ($.isEmptyObject(data)) {
                interval = setInterval(check_task_status, 3000);
            } else {
                $("body").css("cursor", "default");
                manage_stop_button(true);
                get_task_result(data);
                manage_sites_buttons(false);
                manage_go_button();
                manage_clear_button(false);
                manage_commands_selector(false);
            }
        },
        error: function(data) {
            console.log("Error");
        },
        beforeSend: function() {
            manage_stop_button(false);
        }
    });
}

/**
 * Check the task status and if this has finished, clear the
 * interval and get the results.
 */
function check_task_status() {
    $.ajax({
        data: "status",
        type: "GET",
        url: "/index",
        traditional: true,
        success: function(data) {
            if ($.isEmptyObject(data)) {
                console.log("Task not ready yet");
            } else {
                var checkstatus = $(data).get(0);
                if (checkstatus.status == "complete") {
                    clearInterval(interval);
                    $("body").css("cursor", "default");
                    manage_stop_button(true);
                    manage_sites_buttons(false);
                    manage_clear_button(false);
                    manage_go_button();
                    manage_commands_selector(false);
                    get_task_result(data);
                } else {
                    get_task_result(data);
                }
            }
        },
        error: function() {
            clearInterval(interval);
            manage_sites_buttons(false);
        }
    });
}

/**
 * Get the task results and show them in the table with
 * either on or off status.
 */
function get_task_result(data) {
    $.each(data, function(key, value) {
        $.each(value, function (k, v) {
            var status = v.power;
            var tdstatus = $("td[id*='" + k + "s']");
            tdstatus.text(status);
            if (status == "on") {
                tdstatus.addClass("onstatus");
            } else {
                tdstatus.addClass("offstatus");
            }
        })
    })
}

/**
 * Stop the execution requested by the user.
 */
function stop() {
    $.ajax({
        data: 'cancel',
        type: "GET",
        url: "/index",
        dataType: "json",
        traditional: true,
        success: function(data) {
            clearInterval(interval);
        },
        complete: function() {
            $("body").css("cursor", "default");
            manage_sites_buttons(false);
            manage_all_button(false);
            manage_clear_button(false);
            manage_commands_selector(false);
            manage_stop_button(true);
            manage_go_button(false);
        }
    })
}

/**
 * Check or uncheck all hosts in case the upper left checkbox is
 * checked or unchecked.
 */
function check_all() {
    var hosts = $("input:checkbox[name=hosts]");
    var numberofhosts = hosts.length;
    var isanyselected = $("input:checkbox[name=hosts]:checked").length;
    if (isanyselected == 0) {
        hosts.prop("checked", true);
        gobutton.prop("disabled", false);
        gobutton.text("Go (" + numberofhosts + ")");
        manage_commands_selector(false);
        commands.find("option[id=empty]").remove();
        commands.find("option[id=status]").prop("selected", true);
    } else if (isanyselected == 36 || isanyselected == 144) {
        clear_previous_results();
        hosts.prop("checked", false);
        gobutton.prop("disabled", true);
        gobutton.text("Go (0)");
        manage_commands_selector(true);
        commands.find("option[id=up]").before("<option id=empty selected></option>");
    } else {
        clear_previous_results();
        $("input:checkbox[name=hosts]:not(:checked)").prop("checked", true);
        gobutton.text("Go ("+ numberofhosts + ")");
    }
}

/**
 * Clear page and shows it empty.
 */
function clear_page() {
    $("#div_hostlist").empty();
    manage_go_button();
    manage_clear_button(true);
    stopbutton.prop("disabled", true);
    commands.prop("disabled", true);
    commands.find("option[id=up]").before("<option id=empty selected></option>");
}

/**
 * Manage buttons status when one host checkbox is checked or
 * unchecked.
 */
function checked_host() {
    var nhosts = $("input:checkbox[name=hosts]:checked").length;
    clear_previous_results();
    if (nhosts > 0) {
        gobutton.prop("disabled", false);
        gobutton.text("Go (" + nhosts + ")");
        manage_commands_selector(false);
        commands.find("option[id=empty]").remove();
        commands.find("option[id=status]").prop("selected", true);
        if (nhosts == 36 || nhosts == 144) {
            $("#all_hosts").prop("checked", true);
        } else {
            $("#all_hosts").prop("checked", false);
        }
    } else {
        gobutton.text("Go (" + nhosts + ")");
        gobutton.prop("disabled", true);
        manage_commands_selector(true);
        commands.find("option[id=up]").before("<option id=empty selected></option>");
    }
}

/**
 * Manage go button behaviour.
 */
function manage_go_button() {
    var isdisabled = gobutton.prop("disabled");
    if (isdisabled) {
        if ($("input:checkbox[name=hosts]:checked").length == 0) {
            gobutton.prop("disabled", true);
            gobutton.text("Go (0)");
        } else {
            gobutton.prop("disabled", false);
        }
    } else {
        var numenabled = $("input:checkbox[name=hosts]:checked").length;
        gobutton.text("Go (" + numenabled + ")");
        gobutton.prop("disabled", true);
    }
}

/**
 * Manage sites buttons behaviour.
 * @param flag Establish the status of the buttons(enabled or disabled).
 */
function manage_sites_buttons(flag) {
    bifibutton.prop("disabled", flag);
    cienciasbutton.prop("disabled", flag);
    epshbutton.prop("disabled", flag);
    euptbutton.prop("disabled", flag);
    allbutton.prop("disabled", flag);
}

/**
 * Manage all button behaviour.
 * @param flag Establish the status of the button(enabled or disabled).
 */
function manage_all_button(flag) {
    allbutton.prop("disabled", flag);
}

/**
 * Manage clear button behaviour.
 * @param flag Establish the status of the button(enabled or disabled).
 */
function manage_clear_button(state) {
    clearbutton.prop("disabled", state);
}

/**
 * Manage commands selector behaviour.
 * @param flag Establish the status of the button(enabled or disabled).
 */
function manage_commands_selector(state) {
    commands.prop("disabled", state);
}

/**
 * Manage stop button behaviour.
 * @param flag Establish the status of the button(enabled or disabled).
 */
function manage_stop_button(state) {
    stopbutton.prop("disabled", state);
}