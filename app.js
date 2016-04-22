require('dotenv').config();
var builder = require('botbuilder');
var jade = require('jade');
var restify = require('restify');
var request = require('request');

var kelvin = -273.15;

var server = restify.createServer();

var iframeUrl = 'https://webchat.botframework.com/embed/' + process.env.APP_ID + '?s=' +
    process.env.APP_IFRAME_SECRET;

var weatherBot = new builder.BotConnectorBot();
weatherBot.add('/', new builder.CommandDialog()
    .matches('^hello', function (session) {
        session.send('Hi there!');
    })
    .matches('^weather', function (session) {
    	session.beginDialog('/weather');
    })
    .onDefault(function (session) {
        session.send('I didn\'t understand. Say hello to me!');
    })
);

weatherBot.add('/weather', [
    function(session) {
        builder.Prompts.text(session, 'In which city dear?');
    },
    function(session, results) {
        var city = results.response,
            url = 'http://api.openweathermap.org/data/2.5/weather?q=' + city + '&appid=' + process.env.API_KEY,
            parsedBody;
        request(url, function(error, response, body) {
            if (error !== null) {
                session.send('Something went wrong 😞 "%s"', error);
                return;
			}
            if (response.statusCode != 200) {
                session.send('⚠️ - I got an awkward status code: "%d"', response.statusCode);
            }
            parsedBody = JSON.parse(body);
            session.send('There\'s %s in %s. The temperature currently is %s.',
                         parsedBody.weather[0].main, 'Athens',
                         (parsedBody.main.temp + kelvin).toFixed(2));
            session.endDialog();
        });
    }
]);

server.get('/', function indexHTML(req, res, next) {
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(
        jade.renderFile('index.jade', {iframeUrl: iframeUrl}));
    next();
});

server.use(weatherBot.verifyBotFramework(
    {appId: process.env.APP_ID, appSecret: process.env.APP_SECRET}));
server.post('/v1/messages', weatherBot.listen());

server.listen(process.env.PORT || 3000, function () {
    console.log('%s listening to %s', server.name, server.url);
});
