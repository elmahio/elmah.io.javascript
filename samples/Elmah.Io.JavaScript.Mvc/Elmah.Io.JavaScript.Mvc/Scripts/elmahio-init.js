new Elmahio({
    apiKey: 'API_KEY',
    logId: 'LOG_ID'
});

function generateError() {
    throw new Error("This is a test error that goes into your log on elmah.io");
}