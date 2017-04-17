var rapidview;
var sprint;
var auth;

$(document).ready(function () {

    function low(gt) { return Math.floor(gt*.85) }
    function high(gt) { return Math.ceil(gt*1.15) }

    function statusColor(status, $elem) {
        switch (status) {
            case "Open":
                $elem.find(".status").css("color", "coral");
                break;

            case "In Progress":
            case "Ready":
                $elem.find(".status").css("color", "teal");
                break;

            case "Resolved":
            case "Closed":
                $elem.find(".status").css("color", "seagreen");
                break;
        }
    }

    function sanitizeStatus(status) {
        return (status.indexOf("In Progress") > -1 ? "In Progress" : status);
    }

    function addPerson() {
        var $person = $($("#person-template").html());
        $(".team").append($person);
        $person.find(".day").keyup(function (ev) {
            var total = 0;
            $(ev.target.parentElement.parentElement).find(".day").each(function() {
                if ($(this).val()) {
                    total += parseInt($(this).val());
                }
            });
            $person.find(".total").html(total);

            var gt = 0;
            $(".total").each(function () {
                gt += parseInt($(this).html());
            });
            $(".grand-total").html(gt);

            $(".low-total").html(low(gt));
        });

        $person.find(".day,.name").keyup(function () {
            var team = [];
            $(".person").each(function () {
                if ($(this).find(".name").val()) {
                    var p = {
                        name: $(this).find(".name").val(),
                        mo1: $(this).find(".mo1").val(),
                        tu1: $(this).find(".tu1").val(),
                        we1: $(this).find(".we1").val(),
                        th1: $(this).find(".th1").val(),
                        fr1: $(this).find(".fr1").val(),
                        mo2: $(this).find(".mo2").val(),
                        tu2: $(this).find(".tu2").val(),
                        we2: $(this).find(".we2").val(),
                        th2: $(this).find(".th2").val(),
                        fr2: $(this).find(".fr2").val()
                    };
                    team.push(p);
                }
            });
            localStorage.setItem("sprint" + sprint, JSON.stringify(team));
        });

        return $person;
    }

    function loadSprint() {

        $.get("./api/sprint/" + rapidview + "/" + sprint + "?auth=" + auth).done(function (data) {
            $(".dates").show();
            $("#sprint .name").html(data.name);
            $("#sprint .points").html(data.points);
            $("#sprint .hours").html(data.hours);
            $("#sprint .hours-high").html(high(data.hours));
            $(".start").html(data.start);
            $(".end").html(data.end);

            var sprintRemain = 0;

            data.issues.forEach(function (story) {
                var $storyNew = $($("#story-template").html());
                var storyStatus = sanitizeStatus(story.status);
                $storyNew.find(".name").html(story.key + ": " + story.name);
                $storyNew.find(".points").html(story.points || 0);
                $storyNew.find(".hours").html(story.estimate);
                $storyNew.find(".status").html(storyStatus);
                statusColor(storyStatus, $storyNew);
                $("#stories").append($storyNew);

                var storyRemain = 0;

                var $tasks = $(document.createElement("div")).attr("class", "tasks");

                var even = false;
                story.tasks.forEach(function (task) {
                    var $taskNew = $($("#task-template").html());
                    var status = sanitizeStatus(task.status);
                    $taskNew.addClass(even ? "even" : "odd");
                    $taskNew.find(".name").html(task.key + ": " + task.name);
                    $taskNew.find(".hours").html(task.hours);
                    $taskNew.find(".status").html(status);
                    statusColor(status, $taskNew);

                    var taskRemain = (status === "Resolved" || status === "Closed" || status === "Ready" ? 0 : task.hours);
                    $taskNew.find(".remain").html(taskRemain);
                    storyRemain += taskRemain;

                    $tasks.append($taskNew);
                    even = !even;
                });

                $storyNew.find(".remain").html(storyRemain);
                sprintRemain += storyRemain;

                $("#stories").append($tasks);

                $tasks.hide();

                $storyNew.click(function () {
                    console.log($tasks.is(":visible"));
                    if ($tasks.is(":visible")) {
                        $tasks.hide();
                    } else {
                        $tasks.show();
                    }
                });
            });

            $("#sprint .remain").html(sprintRemain);
            $(".people").show();

            $(".person").detach();

            var gt = 0;
            $(".grand-total").html(0);
            $(".low-total").html(0);
            var team = JSON.parse(localStorage.getItem("sprint" + sprint));

            if (team) {
                team.forEach(function (p) {
                    var $person = addPerson();
                    var t = parseInt(p.mo1) + parseInt(p.mo2) + parseInt(p.tu1) + parseInt(p.tu2) + parseInt(p.we1)
                        + parseInt(p.we2) + parseInt(p.th1) + parseInt(p.th2) + parseInt(p.fr1) + parseInt(p.fr2);
                    $person.find(".name").val(p.name);
                    $person.find(".mo1").val(p.mo1);
                    $person.find(".tu1").val(p.tu1);
                    $person.find(".we1").val(p.we1);
                    $person.find(".th1").val(p.th1);
                    $person.find(".fr1").val(p.fr1);
                    $person.find(".mo2").val(p.mo2);
                    $person.find(".tu2").val(p.tu2);
                    $person.find(".we2").val(p.we2);
                    $person.find(".th2").val(p.th2);
                    $person.find(".fr2").val(p.fr2);
                    $person.find(".total").html(t);
                    gt += parseInt(t);
                    $(".team").append($person);
                });
                $(".grand-total").html(gt);

                $(".low-total").html(low(gt));
            }
        });
    }

    $("#add-person").click(function() {
        addPerson()
    });

    $("#sprint-selector").change(function () {
        $("#stories").html("");

        if ($("#sprint-selector").val() != "") {
            sprint = $("#sprint-selector").val();
            localStorage.setItem("sprintView", sprint);
            loadSprint();
        }
    });

    function listSprints() {
        $.get("./api/sprints/" + rapidview + "?auth=" + auth).done(function (data) {
            data.forEach(function (sprint) {
                $("#sprint-selector").append("<option value='" + sprint.id + "'>" + sprint.state + ": " + sprint.name + "</option>");
            });

            sprint = localStorage.getItem("sprintView");
            if (sprint) {
                $("#sprint-selector").val(sprint);
                loadSprint();
            }
        });
    }

    var ls_un = localStorage.getItem("jiraext-nt-username");
    var ls_bd = localStorage.getItem("jiraext-board");

    if (ls_un) {
        $("#username").val(ls_un);
    }
    if (ls_bd) {
        $("#board").val(ls_bd);
    }

    $("#username").keyup(function () {
        localStorage.setItem("jiraext-nt-username", $("#username").val());
    });
    $("#board").keyup(function () {
        localStorage.setItem("jiraext-board", $("#board").val());
    });

    $("#username,#board,#password").keyup(function () {
       $("#go").prop("disabled", !$("#username").val() || !$("#board").val() || !$("#password").val());
    });

    $("#go").click(function () {
        auth = btoa($("#username").val() + ":" + $("#password").val());
        rapidview = $("#board").val();
        $("#password").val("");
        $(".login").hide();
        $(".plan").show();
        listSprints();
    });
});