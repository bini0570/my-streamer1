export const COCO_CLASSES = [
  // 0: Person (Full-body detection)
  { id: 0, name: 'person', category: 'people', color: '#00e5ff', icon: '👤' },

  // 1-8: Vehicles
  { id: 1, name: 'bicycle', category: 'vehicles', color: '#ff9f1c', icon: '🚲' },
  { id: 2, name: 'car', category: 'vehicles', color: '#ff9f1c', icon: '🚗' },
  { id: 3, name: 'motorcycle', category: 'vehicles', color: '#ff9f1c', icon: '🏍️' },
  { id: 4, name: 'airplane', category: 'vehicles', color: '#ff9f1c', icon: '✈️' },
  { id: 5, name: 'bus', category: 'vehicles', color: '#ff9f1c', icon: '🚌' },
  { id: 6, name: 'train', category: 'vehicles', color: '#ff9f1c', icon: '🚆' },
  { id: 7, name: 'truck', category: 'vehicles', color: '#ff9f1c', icon: '🚚' },
  { id: 8, name: 'boat', category: 'vehicles', color: '#ff9f1c', icon: '🚤' },

  // 9-13: Outdoor & Street
  { id: 9, name: 'traffic light', category: 'vehicles', color: '#ff9f1c', icon: '🚦' },
  { id: 10, name: 'fire hydrant', category: 'everyday', color: '#f43f5e', icon: '🧯' },
  { id: 11, name: 'stop sign', category: 'vehicles', color: '#f43f5e', icon: '🛑' },
  { id: 12, name: 'parking meter', category: 'vehicles', color: '#ff9f1c', icon: '🅿️' },
  { id: 13, name: 'bench', category: 'furniture', color: '#fb923c', icon: '🪑' },

  // 14-23: Animals & Pets
  { id: 14, name: 'bird', category: 'animals', color: '#c084fc', icon: '🐦' },
  { id: 15, name: 'cat', category: 'animals', color: '#c084fc', icon: '🐱' },
  { id: 16, name: 'dog', category: 'animals', color: '#c084fc', icon: '🐶' },
  { id: 17, name: 'horse', category: 'animals', color: '#c084fc', icon: '🐴' },
  { id: 18, name: 'sheep', category: 'animals', color: '#c084fc', icon: '🐑' },
  { id: 19, name: 'cow', category: 'animals', color: '#c084fc', icon: '🐮' },
  { id: 20, name: 'elephant', category: 'animals', color: '#c084fc', icon: '🐘' },
  { id: 21, name: 'bear', category: 'animals', color: '#c084fc', icon: '🐻' },
  { id: 22, name: 'zebra', category: 'animals', color: '#c084fc', icon: '🦓' },
  { id: 23, name: 'giraffe', category: 'animals', color: '#c084fc', icon: '🦒' },

  // 24-33: Accessories & Sports
  { id: 24, name: 'backpack', category: 'everyday', color: '#94a3b8', icon: '🎒' },
  { id: 25, name: 'umbrella', category: 'everyday', color: '#94a3b8', icon: '☂️' },
  { id: 26, name: 'handbag', category: 'everyday', color: '#94a3b8', icon: '👜' },
  { id: 27, name: 'tie', category: 'everyday', color: '#94a3b8', icon: '👔' },
  { id: 28, name: 'suitcase', category: 'everyday', color: '#94a3b8', icon: '🧳' },
  { id: 29, name: 'frisbee', category: 'everyday', color: '#94a3b8', icon: '🥏' },
  { id: 30, name: 'skis', category: 'everyday', color: '#94a3b8', icon: '🎿' },
  { id: 31, name: 'snowboard', category: 'everyday', color: '#94a3b8', icon: '🏂' },
  { id: 32, name: 'sports ball', category: 'everyday', color: '#94a3b8', icon: '⚽' },
  { id: 33, name: 'kite', category: 'everyday', color: '#94a3b8', icon: '🪁' },

  // 34-38: Sports Equipment
  { id: 34, name: 'baseball bat', category: 'everyday', color: '#94a3b8', icon: '🏏' },
  { id: 35, name: 'baseball glove', category: 'everyday', color: '#94a3b8', icon: '🥊' },
  { id: 36, name: 'skateboard', category: 'everyday', color: '#94a3b8', icon: '🛹' },
  { id: 37, name: 'surfboard', category: 'everyday', color: '#94a3b8', icon: '🏄' },
  { id: 38, name: 'tennis racket', category: 'everyday', color: '#94a3b8', icon: '🎾' },

  // 39-45: Dining & Kitchenware
  { id: 39, name: 'bottle', category: 'everyday', color: '#94a3b8', icon: '🍾' },
  { id: 40, name: 'wine glass', category: 'everyday', color: '#94a3b8', icon: '🍷' },
  { id: 41, name: 'cup', category: 'everyday', color: '#94a3b8', icon: '☕' },
  { id: 42, name: 'fork', category: 'everyday', color: '#94a3b8', icon: '🍴' },
  { id: 43, name: 'knife', category: 'everyday', color: '#94a3b8', icon: '🔪' },
  { id: 44, name: 'spoon', category: 'everyday', color: '#94a3b8', icon: '🥄' },
  { id: 45, name: 'bowl', category: 'everyday', color: '#94a3b8', icon: '🥣' },

  // 46-55: Food
  { id: 46, name: 'banana', category: 'everyday', color: '#eab308', icon: '🍌' },
  { id: 47, name: 'apple', category: 'everyday', color: '#ef4444', icon: '🍎' },
  { id: 48, name: 'sandwich', category: 'everyday', color: '#f59e0b', icon: '🥪' },
  { id: 49, name: 'orange', category: 'everyday', color: '#f97316', icon: '🍊' },
  { id: 50, name: 'broccoli', category: 'everyday', color: '#22c55e', icon: '🥦' },
  { id: 51, name: 'carrot', category: 'everyday', color: '#f97316', icon: '🥕' },
  { id: 52, name: 'hot dog', category: 'everyday', color: '#ef4444', icon: '🌭' },
  { id: 53, name: 'pizza', category: 'everyday', color: '#ef4444', icon: '🍕' },
  { id: 54, name: 'donut', category: 'everyday', color: '#ec4899', icon: '🍩' },
  { id: 55, name: 'cake', category: 'everyday', color: '#ec4899', icon: '🍰' },

  // 56-61: Furniture
  { id: 56, name: 'chair', category: 'furniture', color: '#fb923c', icon: '🪑' },
  { id: 57, name: 'couch', category: 'furniture', color: '#fb923c', icon: '🛋️' },
  { id: 58, name: 'potted plant', category: 'furniture', color: '#22c55e', icon: '🪴' },
  { id: 59, name: 'bed', category: 'furniture', color: '#fb923c', icon: '🛏️' },
  { id: 60, name: 'dining table', category: 'furniture', color: '#fb923c', icon: '🍽️' },
  { id: 61, name: 'toilet', category: 'furniture', color: '#fb923c', icon: '🚽' },

  // 62-71: Electronics & Computers
  { id: 62, name: 'tv', category: 'electronics', color: '#10b981', icon: '📺' },
  { id: 63, name: 'laptop', category: 'electronics', color: '#10b981', icon: '💻' },
  { id: 64, name: 'mouse', category: 'electronics', color: '#10b981', icon: '🖱️' },
  { id: 65, name: 'remote', category: 'electronics', color: '#10b981', icon: '📱' },
  { id: 66, name: 'keyboard', category: 'electronics', color: '#10b981', icon: '⌨️' },
  { id: 67, name: 'cell phone', category: 'electronics', color: '#10b981', icon: '📱' },
  { id: 68, name: 'microwave', category: 'electronics', color: '#10b981', icon: '📻' },
  { id: 69, name: 'oven', category: 'electronics', color: '#10b981', icon: '🍳' },
  { id: 70, name: 'toaster', category: 'electronics', color: '#10b981', icon: '🍞' },
  { id: 71, name: 'sink', category: 'furniture', color: '#fb923c', icon: '🚰' },

  // 72-79: Appliances & Personal Items
  { id: 72, name: 'refrigerator', category: 'electronics', color: '#10b981', icon: '🧊' },
  { id: 73, name: 'book', category: 'everyday', color: '#94a3b8', icon: '📖' },
  { id: 74, name: 'clock', category: 'everyday', color: '#94a3b8', icon: '⏰' },
  { id: 75, name: 'vase', category: 'everyday', color: '#94a3b8', icon: '🏺' },
  { id: 76, name: 'scissors', category: 'everyday', color: '#94a3b8', icon: '✂️' },
  { id: 77, name: 'teddy bear', category: 'everyday', color: '#94a3b8', icon: '🧸' },
  { id: 78, name: 'hair drier', category: 'electronics', color: '#10b981', icon: '💨' },
  { id: 79, name: 'toothbrush', category: 'everyday', color: '#94a3b8', icon: '🪥' },
];

export const COCO_MAP = {};
COCO_CLASSES.forEach((c) => {
  COCO_MAP[c.id] = c;
});

export const CATEGORY_COLORS = {
  all: '#00e5ff',
  people: '#00e5ff',
  vehicles: '#ff9f1c',
  electronics: '#10b981',
  animals: '#c084fc',
  furniture: '#fb923c',
  everyday: '#94a3b8',
};

export function getCocoClass(id) {
  return (
    COCO_MAP[id] || {
      id,
      name: `object_${id}`,
      category: 'everyday',
      color: '#00e5ff',
      icon: '📦',
    }
  );
}
