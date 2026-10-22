import { Component, ViewEncapsulation } from '@angular/core';

/** Contact (/contact) */
@Component({
  selector: 'uide-root',
  templateUrl: './contact.html',
  styleUrl: './contact.css',
  // Global styles and no added attributes: the page’s DOM and styles are the HTML site’s.
  encapsulation: ViewEncapsulation.None,
})
export class Contact {}
