
var JiraSprintView = function () {
    var _jira = "atomtickets.turner.com";

    var fs = require('fs');
    var http = require('http');
    var async = require("async");
    var schedule = require("node-schedule");
    var moment = require("moment");
    var burn = {};

    var savefile = false;

    function page (path, auth, then) {
        try {
            http.get({
                hostname: _jira,
                port: 80,
                path: path,
                headers: {
                    Authorization: "Basic " + auth
                }

            }, (res) => {
                var err = null;
                var jsondata = "";
                res.on('data', (chunk) => {
                    jsondata += chunk.toString();
                });
                res.on('end', () => {
                    var json = null;
                    try {
                        var json = JSON.parse(jsondata);
                    } catch (e) {
                        err = jsondata;
                    }
                    if (savefile) {
                        file("./logs/" + path.replace(/\//g, "-") + ".json", JSON.stringify(json, null, 2));
                    }

                    then(err, json);
                });
            });
        } catch (e) {
            then (e);
        }
    }

    function file(fn, body) {
        fs.writeFile(fn, body, function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("Created file: " + fn);
        });
    }

    function listSprints(board, auth, callback) {
        console.log ("Requested sprints in board: " + board + ", auth: ", auth);
        page ("/rest/greenhopper/latest/sprintquery/" + board, auth, function (err, data) {
            if (!err) {
                callback(data.sprints);
            } else {
                console.log (err);
            }
        });
    }

    function listIssuesInSprint(board, sprint, auth, callback) {
        page ("/rest/greenhopper/latest/rapid/charts/sprintreport?rapidViewId=" + board + "&sprintId=" + sprint, auth, function (err, data) {
            if (!err) {
                var result = { issues: [] };
                var allIssues = function (issue) {
                    var newi = {
                        id: issue.id,
                        name: issue.summary,
                        key: issue.key,
                        points: issue.currentEstimateStatistic.statFieldValue.value,
                        status: issue.statusName
                    };
                    result.issues.push(newi);
                };

                data.contents.completedIssues.forEach(allIssues);
                data.contents.issuesNotCompletedInCurrentSprint.forEach(allIssues);
                // Don't think we want these.
                // data.contents.puntedIssues.forEach(allIssues);

                result.start = data.sprint.startDate;
                result.end = data.sprint.endDate;
                result.id = sprint;

                callback(result);

            } else {
                console.log (err);
            }
        });
    }

    function listTasksInIssue(issue, auth, callback) {
        var tasks = [];

        page ("/rest/api/2/issue/" + issue, auth, (err, data) => {
            if (!err) {
                var todo = [];

                var taskreader = function(sub){
                    return function (c){
                        page ("/rest/api/2/issue/" + sub.id, auth, (suberr, subdata) => {
                            tasks.push({
                                id: sub.id,
                                key: sub.key,
                                name: sub.fields.summary,
                                hours: subdata ? subdata.fields.customfield_12500 : 0,
                                status: sub.fields.status.name
                            });
                            c();
                        });
                    };
                };

                data.fields.subtasks.forEach((sub) => {
                    todo.push(taskreader(sub));
                });

                async.parallel(todo, ()=>{ callback(tasks); })
            }
        });
    }

    function viewSprint(board, id, auth, callback) {
        var taskcalls = [];

        listIssuesInSprint(board, id, auth, function (result) {
            result.points = 0;
            result.hours = 0;
            result.remain = 0;

            result.issues.forEach(function (i) {
                result.points += (i.points ? i.points : 0);
                i.remain = 0;

                taskcalls.push((c)=>{
                    listTasksInIssue(i.id, auth, function (tasks) {
                        i.tasks = tasks;
                        i.estimate = 0;
                        tasks.forEach(function (t) {
                            t.remain = 0;
                            if (t.status != "Resolved" && t.status != "Closed" && t.status != "Ready") {
                                t.remain = t.hours;
                                result.remain += t.hours;
                                i.remain += t.hours;
                            }
                            i.estimate += t.hours;
                            result.hours += t.hours;
                        });
                        c();
                    });
                });
            });

            async.parallel(taskcalls, ()=>{
                var resend = moment(result.end, "DD/MMM/YY");
                if (!burn[id] && moment() < resend) {
                    burn[id] = {
                        board: board,
                        auth: auth,
                        end: resend.format("MM/DD/YYYY"),
                        days: {}
                    };

                    burn[id].days[moment().format("YYYYMMDD")] = result.remain;

                    file("burndowns.json", JSON.stringify(burn, null, 2));
                }

                callback(result);
            });
        })
    }

    function velocity(board, auth, callback) {
        var vel = [];
        var velf = [];
        listSprints(board, auth, function (sprints) {

            sprints.forEach(function (sprint) {

                var f = function(c) {
                    listIssuesInSprint(board, sprint.id, auth, function (result) {
                        sprint.points = 0;

                        result.issues.forEach(function (i) {
                            sprint.points += (i.points ? i.points : 0);
                        });

                        vel.push(sprint);
                        c();
                    });
                };
                velf.push(f);
            });

            async.parallel(velf, ()=> {
                vel.sort (function (a, b) {
                   return (a.id - b.id);
                });
                callback(vel)
            });
        });
    }

    function burndown(sprint) {
        return burn[sprint];
    }

    function saveburndowns() {
        for (var idx in burn) {
            var today = moment();
            var end = moment(burn[idx].end, "MM/DD/YYYY");
            if (today.isBefore(end) || today.isSame(end, 'day')) {
                viewSprint(burn[idx].board, idx, burn[idx].auth, function (spr) {
                    burn[idx].days[today.format("YYYYMMDD")] = spr.remain;
                    file("burndowns.json", JSON.stringify(burn, null, 2));
                })
            }
        }
    }

    fs.readFile("burndowns.json", null, (err, data)=>{
        if (!err) burn = JSON.parse(data);
        saveburndowns();

        schedule.scheduleJob("0 */1 * * *", saveburndowns);
    });


    return {
        listSprints: listSprints,
        listIssuesInSprint: listIssuesInSprint,
        listTasksInIssue: listTasksInIssue,
        viewSprint: viewSprint,
        velocity: velocity,
        burndown: burndown
    }
}();

module.exports = JiraSprintView;
