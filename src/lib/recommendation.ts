import { listProducts } from "@/lib/appwrite-products";
import { RecommendationInput, Product } from "@/lib/types";

export async function recommendProducts(input: RecommendationInput): Promise<Product[]> {
  const products = await listProducts();
  const popularTeams = Array.from(new Set(products.map((product) => product.team))).slice(0, 6);
  const viewedSet = new Set(input.viewedProductIds);

  const scored = products.map((product) => {
    let score = 0;

    if (viewedSet.has(product.id)) score -= 10;
    if (input.favoriteTeams.includes(product.team)) score += 15;
    if (popularTeams.includes(product.team)) score += 8;
    if (product.rating >= 4.7) score += 6;
    if (product.tags.includes("limited")) score += 5;

    return { product, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.product)
    .filter((item) => !viewedSet.has(item.id))
    .slice(0, 4);
}
