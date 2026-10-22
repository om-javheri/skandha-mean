import { provideZonelessChangeDetection, type Type } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { startForms, startMenus, startMotion } from './site-scripts';

interface Page {
  /** The page's component, loaded when the page opens. */
  load: () => Promise<Type<unknown>>;
  /** The site's shared page behaviour it uses: entrance animations, folding menus, forms that send. */
  motion?: boolean;
  menu?: boolean;
  forms?: boolean;
}

/** Every page of the site, by the key its HTML file names (<uide-root data-page="…">). */
const PAGES: Record<string, Page> = {
  home: { load: () => import('./app/pages/home/home').then((m) => m.Home), motion: true, menu: true },
  'digital-first-services': { load: () => import('./app/pages/digital-first-services/digital-first-services').then((m) => m.DigitalFirstServices), motion: true, menu: true },
  'aimlfor-media': { load: () => import('./app/pages/aimlfor-media/aimlfor-media').then((m) => m.AIMLForMedia), motion: true, menu: true },
  'customized-solutions': { load: () => import('./app/pages/customized-solutions/customized-solutions').then((m) => m.CustomizedSolutions), motion: true, menu: true },
  'digital-sports-operations': { load: () => import('./app/pages/digital-sports-operations/digital-sports-operations').then((m) => m.DigitalSportsOperations), motion: true, menu: true },
  'managed-media-fabric': { load: () => import('./app/pages/managed-media-fabric/managed-media-fabric').then((m) => m.ManagedMediaFabric), motion: true, menu: true },
  'vid-re': { load: () => import('./app/pages/vid-re/vid-re').then((m) => m.VidRE), motion: true, menu: true },
  'media-capability-centres': { load: () => import('./app/pages/media-capability-centres/media-capability-centres').then((m) => m.MediaCapabilityCentres), motion: true, menu: true },
  'media-verticals': { load: () => import('./app/pages/media-verticals/media-verticals').then((m) => m.MediaVerticals), motion: true, menu: true },
  about: { load: () => import('./app/pages/about/about').then((m) => m.About), motion: true, menu: true },
  news: { load: () => import('./app/pages/news/news').then((m) => m.News), motion: true, menu: true },
  contact: { load: () => import('./app/pages/contact/contact').then((m) => m.Contact), motion: true, menu: true, forms: true },
};

const page = PAGES[document.querySelector('uide-root')?.getAttribute('data-page') ?? ''];
if (page) {
  page
    .load()
    .then((component) => bootstrapApplication(component, { providers: [provideZonelessChangeDetection()] }))
    // Bootstrapping draws the page, so the scripts find it.
    .then(() => {
      if (page.motion) startMotion();
      if (page.menu) startMenus();
      if (page.forms) startForms();
    })
    .catch((err: unknown) => console.error(err));
}
