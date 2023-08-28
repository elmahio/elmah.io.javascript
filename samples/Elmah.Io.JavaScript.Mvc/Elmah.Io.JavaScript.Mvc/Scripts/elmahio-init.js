var logger = new Elmahio({
    apiKey: 'API_KEY',
    logId: 'LOG_ID',
    debug: true,
    breadcrumbs: true
});

function generateError() {
    throw new Error("This is a test error that goes into your log on elmah.io");
}

function addBreadcrumb() {
    logger.addBreadcrumb("Information", "Log", "Something happened before the error");
}