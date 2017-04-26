var rapidview;
var sprint;
var auth;
var graphNumber;
var start;
var hours;

$(document).ready(function () {

    function low(gt) { return Math.floor(gt*.9) }
    function high(gt) { return Math.ceil(gt*1.1) }

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
            $(".hours").html(data.hours);
            $(".hours-high").html(high(data.hours));
            $(".start").html(data.start);
            $(".end").html(data.end);

            start = moment(data.start);
            hours = data.hours;

            data.issues.forEach(function (story) {
                var $storyNew = $($("#story-template").html());
                var storyStatus = sanitizeStatus(story.status);
                $storyNew.find(".name").html(story.key + ": " + story.name);
                $storyNew.find(".points").html(story.points || 0);
                $storyNew.find(".hours").html(story.estimate);
                $storyNew.find(".status").html(storyStatus);
                statusColor(storyStatus, $storyNew);
                $("#stories").append($storyNew);

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

                    $taskNew.find(".remain").html(task.remain);

                    $tasks.append($taskNew);
                    even = !even;
                });

                $storyNew.find(".remain").html(story.remain);

                $("#stories").append($tasks);

                $tasks.hide();

                $storyNew.click(function () {
                    if ($tasks.is(":visible")) {
                        $tasks.hide();
                    } else {
                        $tasks.show();
                    }
                });
            });

            $("#sprint .remain").html(data.remain);
            $(".people").show();

            $(".person").detach();

            var gt = 0;
            $(".grand-total").html(0);
            $(".low-total").html(0);
            var team = JSON.parse(localStorage.getItem("sprint" + sprint));

            if (team) {
                team.forEach(function (p) {
                    var $person = addPerson();
                    $person.find(".name").val(p.name);
                    $person.find(".mo1").val(p.mo1);
                    var t = parseInt(p.mo1) || 0;
                    $person.find(".tu1").val(p.tu1);
                    t += parseInt(p.tu1) || 0;
                    $person.find(".we1").val(p.we1);
                    t += parseInt(p.we1) || 0;
                    $person.find(".th1").val(p.th1);
                    t += parseInt(p.th1) || 0;
                    $person.find(".fr1").val(p.fr1);
                    t += parseInt(p.fr1) || 0;
                    $person.find(".mo2").val(p.mo2);
                    t += parseInt(p.mo2) || 0;
                    $person.find(".tu2").val(p.tu2);
                    t += parseInt(p.tu2) || 0;
                    $person.find(".we2").val(p.we2);
                    t += parseInt(p.we2) || 0;
                    $person.find(".th2").val(p.th2);
                    t += parseInt(p.th2) || 0;
                    $person.find(".fr2").val(p.fr2);
                    t += parseInt(p.fr2) || 0;
                    $person.find(".total").html(t);
                    gt += t;
                    $(".team").append($person);
                });
                $(".grand-total").html(gt);

                $(".low-total").html(low(gt));
            }

            $(".hourscompare").show();
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

    function tooltipColor(item, title) {
        return '<span style="color:' + (item.tipcolor || item.color || "white") + '; font-size: 12px">' + title + '</span>';
    }

    function declareOptions(options, defaults) {
        if (options === undefined) options = {};
        for (var key in defaults) {
            if (options[key] === undefined) options[key] = defaults[key];
        }
        return options;
    }

    var vertical = function (target, dataset, options, init) {
        graphNumber++;

        options = declareOptions(options, {
            padding: 25,
            title: function (d) {
                return d.label + ": " + d.count;
            },
            max: d3.max(dataset, function (d) {
                return d.count;
            })
        });

        var genClass = "jiraext-graph-" + graphNumber;
        $(target).addClass(genClass);

        var w = $(target).width();
        var h = $(target).height();
        if (h === 0) h = w;

        var svg = d3.select("." + genClass)
            .append("svg")
            .attr("width", w)
            .attr("height", h);


        svg.selectAll("rect")
            .data(dataset)
            .enter()
            .append("rect")
            .attr("x", function (d, i) {
                return i * (w / dataset.length);
            })
            .attr("y", function (d) {
                return h - Math.max((d.count / options.max) * h, 5);
            })
            .attr("width", w / dataset.length - options.padding)
            .attr("height", function (d) {
                return Math.max((d.count / options.max) * h, 5);
            })
            .attr("fill", function (d) {
                return d.color;
            })
            .attr('title', options.title);

        if (init) init(svg);

        $(target).find('svg rect').tipsy({
            gravity: $.fn.tipsy.autoNS,
            html: true,
            title: function () {
                return tooltipColor(this.__data__, $(this).attr("original-title"));
            }
        });

        return svg;
    };

    function velocityChart() {
        $.get("./api/velocity/" + rapidview + "?auth=" + auth).done(function (data) {
            var $elem = $("<div>");
            $("body").append($elem);
            var $doc = $(document);
            $elem.css({
                position: "absolute",
                top: 0,
                left: 0,
                width: $doc.width() + "px",
                height: $doc.height() + "px",
                background: "white",
                opacity: .95
            });
            $elem.click(function () {
                $elem.detach();
            });
            $elem.append("<div class='chart col-xs-10 col-xs-offset-1' style='height: 400px; margin-top: 200px'>");

            var blues = [ "midnightblue", "mediumblue", "steelblue", "royalblue", "cornflowerblue", "deepskyblue", "lightskyblue" ];
            var colidx = 0;

            var totalp = 0;
            data.forEach(function (spr) {
                spr.label = spr.name;
                spr.count = spr.points;
                totalp += spr.points;
                spr.color = blues[colidx];
                colidx++;
                if (colidx > 6) colidx = 0;
                spr.tipcolor = "lightblue";
            });

            vertical($elem.find(".chart"), data, {title: function (d) {
                return d.label + " [" + d.count + "&nbsp;Points]";
            }});

            $elem.append("<div class='col-xs-12 avg-velocity center'>Average Velocity: <strong>" + Math.floor(totalp / data.length) + " Points</strong></div>");
            $elem.append("<div class='col-xs-12 clickclose center'>Click anywhere to close this chart.</div>");
        });
    }

    $("#velocity-link").click(function () {
       velocityChart();
    });

    function burndownChart() {
        $.get("./api/burndown/" + sprint).done(function (data) {

            var $elem = $("<div>");
            $("body").append($elem);
            var $doc = $(document);
            $elem.css({
                position: "absolute",
                top: 0,
                left: 0,
                width: $doc.width() + "px",
                height: $doc.height() + "px",
                background: "white",
                opacity: .95
            });
            $elem.click(function () {
                $elem.detach();
            });
            $elem.append("<div class='chart col-xs-10 col-xs-offset-1' style='height: 400px; margin-top: 200px'>");

            var colors = [ "#003C36", "#015149", "#00685E", "#037C70", "#009081",
                "#00AB9A", "#00C6B2", "#00D9C4", "#00E6CF", "#00F9E0" ];
            var colidx = 0;

            var plot = [];
            var day = start.clone();
            var today = moment();
            var prev = hours;
            while (day.isBefore(moment(data.end)) || day.isSame(moment(data.end), 'day')) {
                if (day.day() > 0 && day.day() < 6 && !(day.isSame(moment(data.end), 'day') && day.day() === 1)) {
                    var h = data.days[day.format("YYYYMMDD")] || (day.isAfter(today, 'day') ? 0 : prev);
                    plot.push({label: day.format("MM/DD/YYYY"), color: colors[colidx],
                        future: day.isAfter(today, 'day'), count: h, tipcolor: "gainsboro"});
                    prev = h;
                    colidx++;
                }
                day.add(1, "d");
            }

            vertical($elem.find(".chart"), plot, {title: function (d) {
                return d.label + ((d.future) ? " (Date in Future)" : " [" + d.count + "&nbsp;Hours&nbsp;Remaining]");
            }},
            function (svg) {
                svg.append("line")
                    .style("stroke", "black")
                    .style("stroke-width", "4")
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", svg.attr("width"))
                    .attr("y2", svg.attr("height"));
            });

            $elem.append("<div class='col-xs-12 burndown center'>Sprint Burndown Chart</strong></div>");
            $elem.append("<div class='col-xs-12 clickclose center'>Click anywhere to close this chart.</div>");
        }).fail(function (err) {
            alert ("Burndown hours were not recorded for this sprint.")
        });
    }

    $("#burndown-link").click(function () {
        burndownChart();
    });

    $("#logout-link").click(function () {
        $(".login").show();
        $(".plan").hide();
        localStorage.removeItem("jiraext-auth");
        localStorage.removeItem("jiraext-authdate");
    });

    var ls_un = localStorage.getItem("jiraext-nt-username");
    var ls_bd = localStorage.getItem("jiraext-board");
    var ls_au = localStorage.getItem("jiraext-auth");
    var ls_ad = localStorage.getItem("jiraext-authdate");

    if (ls_un) {
        $("#username").val(ls_un);
    }

    if (ls_bd) {
        $("#board").val(ls_bd);
        rapidview = ls_bd;
    }

    if (ls_ad && ls_au) {
        if (moment(ls_ad).isSame(moment(), 'day')) {
            auth = ls_au;

            $(".login").hide();
            $(".plan").show();
            listSprints();
        }
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

        localStorage.setItem("jiraext-auth", auth);
        localStorage.setItem("jiraext-authdate", moment().toJSON());
    });
});