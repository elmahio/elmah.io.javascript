import {ErrorHandler} from '@angular/core';

import * as Elmahio from 'elmah.io.js';

export class ElmahIoErrorHandler implements ErrorHandler {
  logger: any;
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
