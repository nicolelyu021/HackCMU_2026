import type { Place } from '../ports/places';

/** Mock PlacesProvider data. Names double as search keys (normalized substring match). 'mock:' ids = not verified against OSM. */
export const mockPlaces: Place[] = [
  { place_id: 'osm:way/30678664', name: 'Cathedral of Learning', address: '4200 Fifth Ave, Pittsburgh, PA', lat: 40.4443, lng: -79.95319, category: 'tourism' },
  { place_id: 'osm:relation/2785563', name: 'Phipps Conservatory', address: '1 Schenley Dr, Pittsburgh, PA', lat: 40.43889, lng: -79.94871, category: 'tourism' },
  { place_id: 'osm:node/2710170992', name: 'Primanti Bros.', address: '3803 Forbes Ave, Pittsburgh, PA', lat: 40.44177, lng: -79.95689, category: 'restaurant' },
  { place_id: 'osm:way/1478475435', name: 'The Andy Warhol Museum', address: '117 Sandusky St, Pittsburgh, PA', lat: 40.44837, lng: -80.0025, category: 'museum' },
  { place_id: 'osm:way/387635995', name: 'Point State Park', address: 'Downtown, Pittsburgh, PA', lat: 40.44151, lng: -80.01009, category: 'park' },
  { place_id: 'osm:way/54834750', name: 'Duquesne Incline', address: '1220 Grandview Ave, Pittsburgh, PA', lat: 40.4394, lng: -80.0186, category: 'attraction' },
  { place_id: 'osm:relation/5127141', name: 'Strip District', address: 'Penn Ave, Pittsburgh, PA', lat: 40.4516, lng: -79.9834, category: 'neighbourhood' },
  { place_id: 'osm:way/26321001', name: 'Schenley Park', address: 'Schenley Dr, Pittsburgh, PA', lat: 40.4374, lng: -79.9433, category: 'park' },
  { place_id: 'mock:carnegie-museum-natural-history', name: 'Carnegie Museum of Natural History', address: '4400 Forbes Ave, Pittsburgh, PA', lat: 40.4433, lng: -79.95, category: 'museum' },
  { place_id: 'mock:carnegie-mellon-university', name: 'Carnegie Mellon University', address: '5000 Forbes Ave, Pittsburgh, PA', lat: 40.4428, lng: -79.943, category: 'university' },
  { place_id: 'mock:randyland', name: 'Randyland', address: '1501 Arch St, Pittsburgh, PA', lat: 40.4573, lng: -80.0125, category: 'attraction' },
  { place_id: 'mock:mattress-factory', name: 'Mattress Factory', address: '509 Jacksonia St, Pittsburgh, PA', lat: 40.457, lng: -80.0107, category: 'museum' },
  { place_id: 'mock:pamelas-diner-strip', name: "Pamela's Diner (Strip District)", address: '60 21st St, Pittsburgh, PA', lat: 40.4523, lng: -79.986, category: 'restaurant' },
  { place_id: 'mock:gaucho-parrilla', name: 'Gaucho Parrilla Argentina', address: '146 6th St, Pittsburgh, PA', lat: 40.4432, lng: -80.0029, category: 'restaurant' },
  { place_id: 'mock:mount-washington-overlook', name: 'Mount Washington Overlook', address: 'Grandview Ave, Pittsburgh, PA', lat: 40.4392, lng: -80.0164, category: 'viewpoint' },
  { place_id: 'mock:frick-park', name: 'Frick Park', address: 'Beechwood Blvd, Pittsburgh, PA', lat: 40.438, lng: -79.905, category: 'park' },
  { place_id: 'mock:pnc-park', name: 'PNC Park', address: '115 Federal St, Pittsburgh, PA', lat: 40.4469, lng: -80.0057, category: 'stadium' },
  { place_id: 'mock:heinz-history-center', name: 'Heinz History Center', address: '1212 Smallman St, Pittsburgh, PA', lat: 40.4467, lng: -79.9917, category: 'museum' },
  { place_id: 'mock:schenley-plaza', name: 'Schenley Plaza', address: '4100 Forbes Ave, Pittsburgh, PA', lat: 40.4426, lng: -79.953, category: 'park' },
  { place_id: 'mock:the-porch-at-schenley', name: 'The Porch at Schenley', address: '221 Schenley Dr, Pittsburgh, PA', lat: 40.4424, lng: -79.9526, category: 'restaurant' },
  { place_id: 'mock:pittsburgh-pa', name: 'Pittsburgh, PA', address: 'Pittsburgh, Allegheny County, Pennsylvania', lat: 40.4406, lng: -79.9959, category: 'city' },
];

/** bbox of Pittsburgh used by the mock geocode(): [west, south, east, north] */
export const PITTSBURGH_BBOX: [number, number, number, number] = [-80.1, 40.36, -79.86, 40.5];
