import type { BBox, LatLng } from '../common';

export interface Place {
  /** 'osm:<type>/<id>' for Nominatim; 'mock:<slug>' in fixtures. */
  place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
  bbox: BBox | null;
}

export interface PlacesProvider {
  readonly name: string; // 'mock' | 'nominatim'
  /** Destination-level lookup ("Kyoto", "Pittsburgh, PA"). */
  geocode(query: string): Promise<GeocodeResult | null>;
  /** Place-level lookup, bounded to the destination when bbox is given. Empty array = unresolved. */
  search(query: string, opts?: { near?: LatLng; bbox?: BBox; limit?: number }): Promise<Place[]>;
}
