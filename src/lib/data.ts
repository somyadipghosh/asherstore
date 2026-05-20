import { Product } from "@/lib/types";

export const products: Product[] = [
  {
    id: "rm-home-24",
    name: "Real Madrid Home 24/25",
    team: "Real Madrid",
    price: 4499,
    images: [
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=80"
    ],
    version: ["player"],
    sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
    description:
      "Cut for high tempo football. Light on the body, sharp under stadium lights.",
    rating: 4.8,
    tags: ["best-seller", "ucl", "white"],

    isMatchPick: true,
    isBestSeller: true,
    reviews: [
      {
        user: "Amit V.",
        comment: "Quality is elite and stitching is premium.",
        rating: 5,
        createdAt: "2026-02-16"
      },
      {
        user: "Shaan R.",
        comment: "Fit is true to size, delivery was quick.",
        rating: 4,
        createdAt: "2026-03-03"
      }
    ]
  },
  {
    id: "barca-away-24",
    name: "Barcelona Away 24/25",
    team: "Barcelona",
    price: 3999,
    images: [
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80"
    ],
    version: ["fan"],
    sizes: ["M", "L", "XL", "XXL", "XXXL"],
    description:
      "Soft enough for all-day wear, bold enough for away-day noise.",
    rating: 4.5,
    tags: ["new", "blue", "catalan"],

    isMatchPick: true,
    isBestSeller: true,
    reviews: []
  },
  {
    id: "mci-third-24",
    name: "Manchester City Third 24/25",
    team: "Manchester City",
    price: 4299,
    images: [
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80"
    ],
    version: ["player"],
    sizes: ["S", "M", "L"],
    description:
      "A cleaner third-kit look with a fit that stays comfortable through extra time.",
    rating: 4.7,
    tags: ["limited", "third-kit", "city"],

    isMatchPick: true,
    isBestSeller: false,
    reviews: []
  },
  {
    id: "ars-home-24",
    name: "Arsenal Home 24/25",
    team: "Arsenal",
    price: 3899,
    images: [
      "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1200&q=80"
    ],
    version: ["fan"],
    sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
    description:
      "Classic red front and center. Made for matchdays, pubs, and every replay after.",
    rating: 4.4,
    tags: ["red", "best-value"],

    isMatchPick: true,
    isBestSeller: false,
    reviews: []
  },
  {
    id: "acm-retro-07",
    name: "AC Milan Retro 2007",
    team: "AC Milan",
    price: 4699,
    images: [
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80"
    ],
    version: ["player"],
    sizes: ["M", "L", "XL", "XXL", "XXXL"],
    description:
      "A retro tribute with proper texture and that unmistakable Milan energy.",
    rating: 4.9,
    tags: ["retro", "limited", "collector"],

    isMatchPick: true,
    isBestSeller: true,
    reviews: []
  },
  {
    id: "psg-away-24",
    name: "PSG Away 24/25",
    team: "PSG",
    price: 4099,
    images: [
      "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80"
    ],
    version: ["fan"],
    sizes: ["S", "M", "L"],
    description:
      "Paris style meets matchday comfort. Clean lines, easy fit, ready to move.",
    rating: 4.3,
    tags: ["paris", "away", "new"],

    isMatchPick: true,
    isBestSeller: false,
    reviews: []
  }
];

export const popularTeams = ["Real Madrid", "Barcelona", "Manchester City", "Arsenal"];
