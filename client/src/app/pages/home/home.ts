import { Component, ViewEncapsulation } from '@angular/core';

/** Home (/) */
@Component({
  selector: 'uide-root',
  templateUrl: './home.html',
  styleUrl: './home.css',
  // Global styles and no added attributes: the page’s DOM and styles are the HTML site’s.
  encapsulation: ViewEncapsulation.None,
})
export class Home {}
