# elmah.io.javascript
![license](https://img.shields.io/hexpm/l/plug.svg?style=flat-square)

For the most recent documentation, visit [Logging to elmah.io from JavaScript](https://docs.elmah.io/logging-to-elmah-io-from-javascript/).

### Initialization

Immediately-Invoked Function Expression (IIFE)
```html
<script src="elmahio.js?apiKey=YOUR-API-KEY&logId=YOUR-LOG-ID" type="text/javascript"></script>
```

UMD Constructor with options
```html
<script src="elmahio.js" type="text/javascript"></script>
<script type="text/javascript">
  var log = new Elmahio({
    apiKey: 'YOUR-API-KEY',
    logId: 'YOUR-LOG-ID',
  });
</script>
```


### Default options
```javascript
new Elmahio({
  apiKey: null,
  logId: null,
  debug: false,
  application: null,
  filter: null,
  captureConsoleMinimumLevel: 'none'
});
```

### Manual logging
*Works only with UMD Constructor !*
```javascript
var log = new Elmahio({
  apiKey: 'YOUR-API-KEY',
  logId: 'YOUR-LOG-ID',
});

log.verbose(msg);
log.verbose(msg, error);

log.debug(msg);
log.debug(msg, error);

log.information(msg);
log.information(msg, error);

log.warning(msg);
log.warning(msg, error);

log.error(msg);
log.error(msg, error);

log.fatal(msg);
log.fatal(msg, error);
```
Where __msg__ is a text string and __error__ is a [JavaScript Error Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error).

### Manual logging using console logging
*Works only with UMD Constructor !
console.log() is not available for logging !*
```javascript
var log = new Elmahio({
  apiKey: 'YOUR-API-KEY',
  logId: 'YOUR-LOG-ID',
  captureConsoleMinimumLevel: 'debug' // options available: 'none', 'debug', 'info', 'warn', 'error'
});

// captureConsoleMinimumLevel: 'none' will disable logging from console;
// captureConsoleMinimumLevel: 'debug' will enable all of them - console.debug, console.info, console.warn, console.error;
// captureConsoleMinimumLevel: 'info' will enable - console.info, console.warn, console.error;
// captureConsoleMinimumLevel: 'warn' will enable - console.warn, console.error;
// captureConsoleMinimumLevel: 'error' will enable - console.error.

console.error('This is an %s message.', 'error');
console.warn('This is a %s message.', 'warning');
console.info('This is an %s message.', 'information');
console.debug('This is a %s message.', 'debug');
```


### Acknowledgments

* [Rojan Gharibpour](https://github.com/Sojaner)
