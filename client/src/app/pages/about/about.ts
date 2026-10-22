import { Component, ViewEncapsulation } from '@angular/core';

/** About (/about) */
@Component({
  selector: 'uide-root',
  templateUrl: './about.html',
  styleUrl: './about.css',
  // Global styles and no added attributes: the page’s DOM and styles are the HTML site’s.
  encapsulation: ViewEncapsulation.None,
})
export class About {}
