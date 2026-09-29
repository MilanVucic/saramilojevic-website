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
  verticalImage?: string;
  verticalImageWidth?: number;
  verticalImageHeight?: number;
  experimental: true;
  /** Shadow offset in CSS pixels, estimated from the apparent light direction. */
  shadowOffsetPx: { x: number; y: number };
  /** Set for walls where artwork is fit to the photo rather than a real-world measurement. */
  unlimitedArtworkSize?: boolean;
  /** Approximate physical dimensions and bounds of the front-facing wall in the photo. */
  wall: {
    widthCm?: number;
    heightCm?: number;
    corners: {
      topLeft: RoomPoint;
      topRight: RoomPoint;
      bottomRight: RoomPoint;
      bottomLeft: RoomPoint;
    };
  };
}

// Provisional calibration values; adjust the corners and dimensions after
// reviewing /room-calibration/. Percentages refer to each image's displayed bounds.
export const experimentalRoomScenes: RoomScene[] = [
  {
    id: 'bedroom-medium',
    title: 'Bedroom',
    image: '/assets/room-scenes/bedroom-medium.png',
    imageWidth: 1448,
    imageHeight: 1086,
    experimental: true,
    shadowOffsetPx: { x: 8, y: 3 },
    wall: {
      widthCm: 200,
      heightCm: 125,
      corners: {
        topLeft: { xPct: 24, yPct: 5 },
        topRight: { xPct: 80, yPct: 5 },
        bottomRight: { xPct: 80, yPct: 40 },
        bottomLeft: { xPct: 24, yPct: 40 },
      },
    },
  },
  {
    id: 'living-room-large',
    title: 'Living room',
    image: '/assets/room-scenes/living-room-large.png',
    imageWidth: 1447,
    imageHeight: 1087,
    experimental: true,
    shadowOffsetPx: { x: 8, y: 3 },
    wall: {
      widthCm: 240,
      heightCm: 230,
      corners: {
        topLeft: { xPct: 30, yPct: 8 },
        topRight: { xPct: 85, yPct: 8 },
        bottomRight: { xPct: 85, yPct: 63 },
        bottomLeft: { xPct: 30, yPct: 63 },
      },
    },
  },
  {
    id: 'living-room-medium',
    title: 'Living room',
    image: '/assets/room-scenes/living-room-medium.png',
    imageWidth: 1448,
    imageHeight: 1086,
    experimental: true,
    shadowOffsetPx: { x: 7, y: 3 },
    wall: {
      widthCm: 270,
      heightCm: 155,
      corners: {
        topLeft: { xPct: 18, yPct: 5 },
        topRight: { xPct: 90, yPct: 5 },
        bottomRight: { xPct: 90, yPct: 57 },
        bottomLeft: { xPct: 18, yPct: 57 },
      },
    },
  },
  {
    id: 'white-wall-brick',
    title: 'White brick wall',
    image: '/assets/room-scenes/white-wall-1.jpg',
    imageWidth: 4032,
    imageHeight: 3024,
    experimental: true,
    shadowOffsetPx: { x: 6, y: 8 },
    wall: {
      widthCm: 220,
      heightCm: 160,
      corners: {
        topLeft: { xPct: 4, yPct: 4 },
        topRight: { xPct: 96, yPct: 4 },
        bottomRight: { xPct: 96, yPct: 96 },
        bottomLeft: { xPct: 4, yPct: 96 },
      },
    },
  },
  {
    id: 'white-wall-horizontal',
    title: 'White wall · flexible scale',
    image: '/assets/room-scenes/white-wall-horizontal.jpg',
    imageWidth: 4438,
    imageHeight: 2959,
    verticalImage: '/assets/room-scenes/white-wall-vertical.jpg',
    verticalImageWidth: 2959,
    verticalImageHeight: 4438,
    experimental: true,
    unlimitedArtworkSize: true,
    shadowOffsetPx: { x: 6, y: 8 },
    wall: {
      corners: {
        topLeft: { xPct: 4, yPct: 4 },
        topRight: { xPct: 96, yPct: 4 },
        bottomRight: { xPct: 96, yPct: 96 },
        bottomLeft: { xPct: 4, yPct: 96 },
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
  unlimitedArtworkSize: scene.unlimitedArtworkSize ?? false,
  estimatedWall: {
    widthCm: scene.wall.widthCm,
    heightCm: scene.wall.heightCm,
  },
  corners: scene.wall.corners,
}));
