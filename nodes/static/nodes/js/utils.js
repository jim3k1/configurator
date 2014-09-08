/**
 * Created by jim on 12/03/14.
*/

$(document).ready(function() {
    var interval = null;
});

function get_selected(sname) {
    $.ajax({
        data: {
            name: sname
        },
        url: "/index",
        dataType: "json",
        success: function(data) {
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
    $("#button_clear").prop("disabled", false);
}

function get_host() {
    var selected_hosts = [];
    var checked_hosts = $("input:checkbox[name=hosts]:checked");
    checked_hosts.each(function() {
        selected_hosts.push($(this).val());
    });
    return selected_hosts;
}

function get_selected_hosts() {
    var allhosts = get_host();
    var command = $("#id-select-commands").val();
    manage_all_buttons(true);
    $("body").css("cursor", "progress");
    $.ajax({
        type: "GET",
        url: "/index",
        dataType: "json",
        data: {
            selectedhosts: allhosts,
            cmd: command
        },
        traditional: true,
        success: function(data) {
            if ($.isEmptyObject(data)) {
                interval = setInterval(check_task_status, 3000);
            } else {
                $("#button_stop").prop("disabled", true);
                $("body").css("cursor", "default");
                get_task_result(data);
                manage_all_buttons(false);
            }
        },
        error: function(data) {
            console.log("Error");
        },
        beforeSend: function() {
            $("#button_stop").prop("disabled", false);
        }
    });
}

function check_all() {
    var selector = $("#id-select-commands");
    var buttongo = $("#button_go");
    var hosts = $("input:checkbox[name=hosts]");
    var numberofhosts = hosts.length;
    var isanyselected = $("input:checkbox[name=hosts]:checked").length;
    if (isanyselected == 0) {
        hosts.prop("checked", true);
        buttongo.prop("disabled", false);
        buttongo.text("Go (" + numberofhosts + ")");
        selector.prop("disabled", false);
        selector.find("option[id=empty]").remove();
        selector.find("option[id=status]").prop("selected", true);
    } else if (isanyselected == 36 || isanyselected == 144) {
        hosts.prop("checked", false);
        buttongo.prop("disabled", true);
        buttongo.text("Go (0)");
        selector.prop("disabled", true);
        selector.find("option[id=up]").before("<option id=empty selected></option>");
    } else {
        $("input:checkbox[name=hosts]:not(:checked)").prop("checked", true);
        buttongo.text("Go ("+ numberofhosts + ")");
    }
}

function clear_page() {
    var selector = $("#id-select-commands");
    $("#div_hostlist").empty();
    manage_go_button();
    manage_clear_button();
    $("#button_stop").prop("disabled", true);
    selector.prop("disabled", true);
    selector.find("option[id=up]").before("<option id=empty selected></option>");
}

function manage_go_button() {
    var buttongo = $("#button_go");
    var isdisabled = buttongo.prop("disabled");
    if (isdisabled) {
        if ($("input:checkbox[name=hosts]:checked").length == 0) {
            buttongo.prop("disabled", true);
        } else {
            buttongo.prop("disabled", false);
        }
    } else {
        var numenabled = $("input:checkbox[name=hosts]:checked").length;
        buttongo.text("Go (" + numenabled + ")");
        buttongo.prop("disabled", true);
    }
}

function manage_clear_button() {
    var clearbtn = $("#button_clear");
    var isdisabled = clearbtn.prop("disabled");
    if (isdisabled == true) {
        clearbtn.prop("disabled", false);
    } else {
        clearbtn.prop("disabled", true);
    }
}

function checked_host() {
    var selector = $("#id-select-commands");
    var buttongo = $("#button_go");
    var nhosts = $("input:checkbox[name=hosts]:checked").length;
    if (nhosts > 0) {
        buttongo.prop("disabled", false);
        buttongo.text("Go (" + nhosts + ")");
        selector.prop("disabled", false);
        selector.find("option[id=empty]").remove();
        selector.find("option[id=status]").prop("selected", true);
        if (nhosts == 36) {
            $("#all_hosts").prop("checked", true);
        } else {
            $("#all_hosts").prop("checked", false);
        }
    } else {
        buttongo.text("Go (" + nhosts + ")");
        buttongo.prop("disabled", true);
        selector.prop("disabled", true);
        selector.find("option[id=up]").before("<option id=empty selected></option>");
    }
}

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
            manage_all_buttons(false);
        }
    })
}

function check_task_status() {
    $.ajax({
        data: "status",
        type: "GET",
        url: "/index",
        traditional: true,
        success: function(data) {
            var checkstatus = $(data).get(0);
            if ($.isEmptyObject(data)) {
                console.log("Task not ready yet");
            } else if (checkstatus.status == 'failed') {
                clearInterval(interval);
                $("body").css("cursor", "default");
                $("#button_stop").prop("disabled", true);
                manage_all_buttons(false);
            } else if (checkstatus.status == 'waiting') {
                get_task_result(data);
            } else {
                $("#button_stop").prop("disabled", true);
                $("body").css("cursor", "default");
                clearInterval(interval);
                get_task_result(data);
                manage_all_buttons(false);
            }
        },
        error: function() {
            clearInterval(interval);
            manage_all_buttons(false);
        }
    });
}

function get_task_result(data) {
    $.each(data, function(key, value) {
        $.each(value, function (k, v) {
            var status = v.power;
            var tdstatus = $("td[id*='" + k + "s']");
            tdstatus.text(status);
            if (status == 'on') {
                tdstatus.addClass("onstatus");
            } else {
                tdstatus.addClass("offstatus");
            }
        })
    })
}

function manage_all_buttons(flag) {
    manage_go_button();
    manage_clear_button();
    $("#Bifi").prop("disabled", flag);
    $("#Ciencias").prop("disabled", flag);
    $("#EPSH").prop("disabled", flag);
    $("#EUPT").prop("disabled", flag);
    $("#all").prop("disabled", flag);
    $("#button_clear").prop("disabled", flag);
    $("#id-select-commands").prop("disabled", flag);
}