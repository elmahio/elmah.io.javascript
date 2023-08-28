import {ErrorHandler} from '@angular/core';

import * as Elmahio from 'elmah.io.javascript';

export class ElmahIoErrorHandler implements ErrorHandler {
  logger: Elmahio;
  constructor() {
    this.logger = new Elmahio({
      apiKey: 'API_KEY',
      logId: 'LOG_ID'
    });
  }
  handleError(error) {
    if (error && error.message) {
      this.logger.error(error.message, error);
    } else {
      this.logger.error('Error in application', error);
    }
  }
}
