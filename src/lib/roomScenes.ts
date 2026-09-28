export interface RoomPoint {
  xPct: number;
  yPct: number;
}

export interface RoomScene {
  id: string;
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  experimental: true;
  /** Shadow offset in CSS pixels, estimated from the apparent light direction. */
  shadowOffsetPx: { x: number; y: number };
  /** Approximate physical dimensions and bounds of the front-facing wall in the photo. */
  wall: {
    widthCm: number;
    heightCm: number;
    corners: {
      topLeft: RoomPoint;
      topRight: RoomPoint;
      bottomRight: RoomPoint;
      bottomLeft: RoomPoint;
    };
  };
}

// Percentages and dimensions below are editable calibration values. Keep the
// dimensions and corner percentages in sync with the calibration page.
export const experimentalRoomScenes: RoomScene[] = [
  {
    id: 'small',
    title: 'Small wall area',
    image: '/assets/room-scenes/small.webp',
    imageWidth: 2000,
    imageHeight: 1125,
    experimental: true,
    shadowOffsetPx: { x: 6, y: 8 },
    wall: {
      widthCm: 340,
      heightCm: 76,
      corners: {
        topLeft: { xPct: 6, yPct: 4 },
        topRight: { xPct: 94, yPct: 4 },
        bottomRight: { xPct: 94, yPct: 42 },
        bottomLeft: { xPct: 6, yPct: 42 },
      },
    },
  },
  {
    id: 'medium',
    title: 'Medium wall area',
    image: '/assets/room-scenes/medium.webp',
    imageWidth: 2000,
    imageHeight: 1125,
    experimental: true,
    shadowOffsetPx: { x: -6, y: 8 },
    wall: {
      widthCm: 200,
      heightCm: 140,
      corners: {
        topLeft: { xPct: 52, yPct: 4 },
        topRight: { xPct: 96, yPct: 4 },
        bottomRight: { xPct: 96, yPct: 54 },
        bottomLeft: { xPct: 52, yPct: 54 },
      },
    },
  },
  {
    id: 'large',
    title: 'Large wall area',
    image: '/assets/room-scenes/large.webp',
    imageWidth: 2000,
    imageHeight: 1125,
    experimental: true,
    shadowOffsetPx: { x: 6, y: 8 },
    wall: {
      widthCm: 280,
      heightCm: 260,
      corners: {
        topLeft: { xPct: 44, yPct: 6 },
        topRight: { xPct: 96, yPct: 6 },
        bottomRight: { xPct: 96, yPct: 91 },
        bottomLeft: { xPct: 44, yPct: 91 },
      },
    },
  },
];

export const roomCalibrationScenes = experimentalRoomScenes.map(scene => ({
  id: scene.id,
  title: scene.title,
  image: scene.image,
  imageWidth: scene.imageWidth,
  imageHeight: scene.imageHeight,
  estimatedWall: { widthCm: scene.wall.widthCm, heightCm: scene.wall.heightCm },
  corners: scene.wall.corners,
}));
