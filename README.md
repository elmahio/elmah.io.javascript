# elmahio-logger

### Initialization

Immediately-Invoked Function Expression (IIFE)
```
<script src="elmahio-logger.js?api_key=YOUR-API-KEY&log_id=YOUR-LOG-ID" type="text/javascript"></script>
```
or

UMD Constructor
```
<script src="elmahio-logger.js" type="text/javascript"></script>
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
  debug: false
});
```


### Debugging
```
debug: true
```
![debugging true - demo](debug-true.png)


### Manual logging
*Works only with UMD Constructor !*
```
<script type="text/javascript">

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

</script>
```
Where __msg__ is a text string and __error__ is an object.

```
var error = {
  "hostname": document.domain,
  "title": "error title would go here",
  "type": "error type would go here",
  "severity": "Error",
  "url": [document.location.protocol,'//',document.location.host,document.location.pathname,document.location.hash].join('') || '/',
  "queryString": [
    {
      "key": "you need to parse up",
      "value": "document.location.search"
    }
  ],
  "data": [
    {
      "key": "User-Language",
      "value": navigator.language
    },
    {
      "key": "Color-Depth",
      "value": screen.colorDepth
    },
    ...
  ],
  "serverVariables": [
    {
      "key": "User-Agent",
      "value": navigator.userAgent
    },
    {
      "key": "Referer",
      "value": document.referrer
    }
  ]
}
```
