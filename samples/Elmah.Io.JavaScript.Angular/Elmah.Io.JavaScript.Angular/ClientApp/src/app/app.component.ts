import { Component } from '@angular/core';
import * as Elmahio from 'elmah.io.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';

  constructor() {
    const logger = new Elmahio({ apiKey: 'API_KEY', logId: 'LOG_ID' });
    logger.information('Sample Angular project started!');
  }
}
