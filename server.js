
var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', express.static('view'));

var port = process.env.PORT || 8420;

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

app.use('/api', router);

app.listen(port);