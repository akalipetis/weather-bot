require('dotenv').config();
var builder = require('botbuilder');
var jade = require('jade');
var restify = require('restify');
var request = require('request');

var kelvin = -273.15;

var server = restify.createServer();

var iframeUrl = 'https://webchat.botframework.com/embed/' + process.env.APP_ID + '?s=' +
    process.env.APP_IFRAME_SECRET;

var weatherBot = new builder.BotConnectorBot(),
    luisDialog = new builder.LuisDialog(process.env.LUIS_URL);
weatherBot.add('/', luisDialog);

luisDialog.on('WeatherQuery', [
    function (session, args, next) {
        var city = builder.EntityRecognizer.findEntity(args.entities, 'city'),
            url,
            parsedBody;
        if (!city) {
            city = 'Athens';
        } else {
            city = city.entity;
        }
        url = 'http://api.openweathermap.org/data/2.5/weather?q=' + city + '&appid=' + process.env.API_KEY;
        request(url, function(error, response, body) {
            if (error !== null) {
                session.send('Something went wrong 😞 "%s"', error);
                return;
			}
            if (response.statusCode != 200) {
                session.send('⚠️ - I got an awkward status code: "%d"', response.statusCode);
            }
            parsedBody = JSON.parse(body);
            session.send('There\'s %s in %s. The temperature currently is %s °C.',
                         parsedBody.weather[0].description, city,
                         (parsedBody.main.temp + kelvin).toFixed(0));
            session.endDialog();
        });
    },
]);

luisDialog.onDefault(builder.DialogAction.send('I\'m sorry. I didn\'t understand.'));

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
