
var JiraSprintView = function () {
    var _jira = "atomtickets.turner.com";

    var fs = require('fs');
    var http = require('http');
    var async = require("async");

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
                                hours: subdata.fields.customfield_12500,
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

            result.issues.forEach(function (i) {
                result.points += (i.points ? i.points : 0);

                taskcalls.push((c)=>{
                    listTasksInIssue(i.id, auth, function (tasks) {
                        i.tasks = tasks;
                        i.estimate = 0;
                        tasks.forEach(function (t) {
                            i.estimate += t.hours;
                            result.hours += t.hours;
                        });
                        c();
                    })
                });
            });
            async.parallel(taskcalls, ()=>{
                file("sprint.json", JSON.stringify(result, null, 2));
                callback(result);
            });
        })
    }

    return {
        listSprints: listSprints,
        listIssuesInSprint: listIssuesInSprint,
        listTasksInIssue: listTasksInIssue,
        viewSprint: viewSprint
    }
}();

module.exports = JiraSprintView;
