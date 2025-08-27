
export type Station = {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  lines: string[];
};

export type MetroLine = {
  id: string;
  name: string;
  color: string;
  stations: string[]; // array of station ids
};
