import { Client, Databases, Query } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69c69d1c0001317b3d6a";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || "asher_store_db";
const productsCollectionId = process.env.APPWRITE_COLLECTION_PRODUCTS_ID || "products";

if (!apiKey) {
  throw new Error("APPWRITE_API_KEY is required for seeding.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

const seedProducts = [
  {
    id: "rm-home-24",
    name: "Real Madrid Home 24/25",
    team: "Real Madrid",
    league: "La Liga",
    price: 4499,
    images: [
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=80"
    ],
    version: "player",
    sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
    description: "Cut for high tempo football. Light on the body, sharp under stadium lights.",
    rating: 4.8,
    tags: ["best-seller", "ucl", "white"],

    isMatchPick: true,
    reviews: []
  },
  {
    id: "barca-away-24",
    name: "Barcelona Away 24/25",
    team: "Barcelona",
    league: "La Liga",
    price: 3999,
    images: [
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80"
    ],
    version: "fan",
    sizes: ["M", "L", "XL", "XXL", "XXXL"],
    description: "Soft enough for all-day wear, bold enough for away-day noise.",
    rating: 4.5,
    tags: ["new", "blue", "catalan"],

    isMatchPick: true,
    reviews: []
  },
  {
    id: "mci-third-24",
    name: "Manchester City Third 24/25",
    team: "Manchester City",
    league: "Premier League",
    price: 4299,
    images: [
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80"
    ],
    version: "player",
    sizes: ["S", "M", "L"],
    description: "A cleaner third-kit look with a fit that stays comfortable through extra time.",
    rating: 4.7,
    tags: ["limited", "third-kit", "city"],

    isMatchPick: true,
    reviews: []
  }
];

function toPayload(product) {
  return {
    id: product.id,
    name: product.name,
    team: product.team,
    league: product.league,
    price: product.price,
    images: product.images,
    version: product.version,
    sizes: product.sizes,
    description: product.description,
    rating: product.rating,
    tags: product.tags,

    isMatchPick: product.isMatchPick,
    reviews: JSON.stringify(product.reviews)
  };
}

async function upsertProduct(product) {
  const existing = await databases.listDocuments(databaseId, productsCollectionId, [
    Query.equal("id", product.id),
    Query.limit(1)
  ]);

  if (existing.documents[0]) {
    const updated = await databases.updateDocument(
      databaseId,
      productsCollectionId,
      existing.documents[0].$id,
      toPayload(product)
    );
    return { type: "updated", id: updated.$id };
  }

  const created = await databases.createDocument(
    databaseId,
    productsCollectionId,
    product.id,
    toPayload(product)
  );

  return { type: "created", id: created.$id };
}

async function run() {
  let created = 0;
  let updated = 0;

  for (const product of seedProducts) {
    const result = await upsertProduct(product);
    if (result.type === "created") created += 1;
    if (result.type === "updated") updated += 1;
  }

  console.log(`Seed complete. created=${created}, updated=${updated}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
