import Elmahio from 'elmah.io.javascript';
var logger = new Elmahio({
    apiKey: 'API_KEY',
    logId: 'LOG_ID'
});

/** @type {import('@sveltejs/kit').HandleClientError} */
export function handleError({ error, event }) {
    if (error && error.message) {
        logger.error(error.message, error);
    } else {
        logger.error('Error in application', error);
    }
}