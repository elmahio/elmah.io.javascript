import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { NavMenuComponent } from './nav-menu/nav-menu.component';
import { HomeComponent } from './home/home.component';
import { CounterComponent } from './counter/counter.component';
import { FetchDataComponent } from './fetch-data/fetch-data.component';

class ElmahIoErrorHandler implements ErrorHandler {
  logger: any;
  constructor() {
    this.logger = new Elmahio({
      apiKey: 'API_KEY',
      logId: 'LOG_ID',
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

@NgModule({
  declarations: [
    AppComponent,
    NavMenuComponent,
    HomeComponent,
    CounterComponent,
    FetchDataComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent, pathMatch: 'full' },
      { path: 'counter', component: CounterComponent },
      { path: 'fetch-data', component: FetchDataComponent },
    ])
  ],
  providers: [{ provide: ErrorHandler, useClass: ElmahIoErrorHandler }],
  bootstrap: [AppComponent]
})
export class AppModule { }
