# elmahio-logger

#### Initialization
```
<script src="elmahio-logger.js?api_key=YOUR-API-KEY&log_id=YOUR-LOG-ID" type="text/javascript"></script>
```
or
```
<script src="elmahio-logger.js" type="text/javascript"></script>
<script type="text/javascript">
var log = new Elmahio({
  apiKey: 'YOUR-API-KEY',
  logId: 'YOUR-LOG-ID',
});
</script>
```

#### Default options
```
new Elmahio({
  apiKey: null,
  logId: null,
  debug: false
});
```

#### Debugging
```
debug: true
```
![debugging true - demo](debug-true.png)
