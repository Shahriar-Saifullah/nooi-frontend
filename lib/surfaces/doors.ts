/**
 * Door finishes — wood surfaces applied to door leaves
 * -----------------------------------------------------
 * Colour maps only: one texture covers a whole leaf, so the grain runs the
 * full height of the door rather than tiling. That matches how real veneered
 * doors look and avoids visible repeats on a 2.1 m surface.
 *
 * Adding a finish:
 *   1. Drop a door-proportioned image (roughly 1:2) in /public/textures/door/
 *   2. Add an entry below
 * Normal maps are optional and usually unnecessary — door leaves are flat.
 */

export interface DoorFinish {
  id: string;                 // STABLE — saved per door, never rename
  name: string;
  map: string;
  roughness?: number;
  thumbnail?: string;         // defaults to `map`
  credit?: { source: string; license: string; url?: string };
}

export const DOOR_FINISHES: DoorFinish[] = [
  {
    id: "door-light-ash",
    name: "Light Ash",
    map: "/textures/door/light_ash.jpg",
    roughness: 0.6,
    credit: { source: "3DSKY", license: "VERIFY BEFORE SHIPPING" },
  },
  {
    id: "door-grey-oak",
    name: "Grey Oak",
    map: "/textures/door/grey_oak.jpg",
    roughness: 0.6,
    credit: { source: "3DSKY", license: "VERIFY BEFORE SHIPPING" },
  },
  {
    id: "door-american-walnut",
    name: "American Walnut",
    map: "/textures/door/american_walnut.jpg",
    roughness: 0.5,
    credit: { source: "3DSKY", license: "VERIFY BEFORE SHIPPING" },
  },
  {
    id: "door-dark-walnut",
    name: "Dark Walnut",
    map: "/textures/door/dark_walnut.jpg",
    roughness: 0.5,
    credit: { source: "3DSKY", license: "VERIFY BEFORE SHIPPING" },
  },
  {
    id: "door-smoked-oak",
    name: "Smoked Oak",
    map: "/textures/door/smoked_oak.jpg",
    roughness: 0.65,
    credit: { source: "3DSKY", license: "VERIFY BEFORE SHIPPING" },
  },
];

export const doorFinishById = (id: string): DoorFinish | undefined =>
  DOOR_FINISHES.find(f => f.id === id);