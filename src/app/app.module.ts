import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RedditService } from './reddit.service';
import { SearchService } from './search.service';
import { HttpClientModule } from '@angular/common/http';
import { HTMLEscapeUnescapeModule } from 'html-escape-unescape';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    HTMLEscapeUnescapeModule,
    FormsModule,
  ],
  providers: [RedditService, SearchService],
  bootstrap: [AppComponent]
})
export class AppModule { }
