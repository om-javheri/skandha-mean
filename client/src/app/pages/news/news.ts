import { Component, ViewEncapsulation } from '@angular/core';

/** News (/news) */
@Component({
  selector: 'uide-root',
  templateUrl: './news.html',
  styleUrl: './news.css',
  // Global styles and no added attributes: the page’s DOM and styles are the HTML site’s.
  encapsulation: ViewEncapsulation.None,
})
export class News {}
