// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your Javascript code.
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
    debugger;
    logger.addBreadcrumb("Information", "Log", "Something happened before the error");
}