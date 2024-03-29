
var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');

var config = require("./conf.json");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', express.static('view'));

var port = process.env.PORT || config.port;

var router = express.Router();

var jira = require('./reader/reader');

router.get('/sprint/:board/:id', function(req, res) {
    jira.viewSprint(req.params.board, req.params.id, req.query.auth, function (sprint) {
        res.json(sprint);
    });
});

router.get('/sprints/:board', function(req, res) {
    jira.listSprints(req.params.board, req.query.auth, function (sprints) {
        res.json(sprints);
    });
});

router.get('/velocity/:board', function(req, res) {
    jira.velocity(req.params.board, req.query.auth, function (velocity) {
        res.json(velocity);
    });
});

router.get('/burndown/:sprint', function(req, res) {
    res.json(jira.burndown(req.params.sprint));
});

app.use('/api', router);

app.listen(port);