# elmah.io.js
![license](https://img.shields.io/hexpm/l/plug.svg?style=flat-square)

For the most recent documentation, visit [Logging to elmah.io from JavaScript](https://docs.elmah.io/logging-to-elmah-io-from-javascript/).

### Initialization

Immediately-Invoked Function Expression (IIFE)
```
<script src="elmahio.js?apiKey=YOUR-API-KEY&logId=YOUR-LOG-ID" type="text/javascript"></script>
```

UMD Constructor with options
```
<script src="elmahio.js" type="text/javascript"></script>
<script type="text/javascript">
  var log = new Elmahio({
    apiKey: 'YOUR-API-KEY',
    logId: 'YOUR-LOG-ID',
  });
</script>
```


### Default options
```
new Elmahio({
  apiKey: null,
  logId: null,
  debug: false,
  application: null,
  filter: null
});
```

### Manual logging
*Works only with UMD Constructor !*
```
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
