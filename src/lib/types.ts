export type JerseyVersion =
  | "sublimation"
  | "master"
  | "fan"
  | "player"
  | "special-edition"
  | "clearance"
  | "kids-kit"
  | "Sublimation"
  | "Master"
  | "Fan"
  | "Player"
  | "Special Edition"
  | "Special Edition Version"
  | "Clearance"
  | "Clearance Stock"
  | "Kids Kit";

export type JerseySize = "S" | "M" | "L" | "XL" | "XXL" | "XXXL";

export interface Review {
  user: string;
  comment: string;
  rating: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  team: string;
  price: number;
  images: string[];
  version: JerseyVersion[];
  sizes: JerseySize[];
  description: string;
  rating: number;
  reviewCount?: number;
  tags: string[];
  isMatchPick: boolean;
  isBestSeller: boolean;
  reviews: Review[];
}

export interface CartItem {
  productId: string;
  size: JerseySize;
  qty: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  favoriteTeam?: string;
  favoriteTeams: string[];
  phone?: string;
  newsletter?: boolean;
}

export interface DeliveryEstimate {
  pincode: string;
  etaDays: number;
}

export interface RecommendationInput {
  viewedProductIds: string[];
  favoriteTeams: string[];
}
