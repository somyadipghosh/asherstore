import { z } from "zod";

import { getProductById } from "@/lib/appwrite-products";
import type { JerseySize } from "@/lib/types";

const sizeEnum = z.enum(["S", "M", "L", "XL", "XXL", "XXXL"]);

const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1),
  size: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    sizeEnum
  ),
  qty: z.coerce.number().int().min(1).max(10),
});

export const checkoutItemsSchema = z.array(checkoutItemSchema).min(1).max(30);

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;

export type PricedCheckoutItem = {
  productId: string;
  size: JerseySize;
  qty: number;
  price: number;
};

export type PricedCheckoutSummary = {
  pricedItems: PricedCheckoutItem[];
  totalRupees: number;
  totalPaise: number;
};

export async function priceCheckoutItems(
  items: CheckoutItemInput[]
): Promise<PricedCheckoutSummary> {
  const parsedItems = checkoutItemsSchema.parse(items);

  const pricedItems = await Promise.all(
    parsedItems.map(async (item) => {
      const product = await getProductById(item.productId);

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (!product.sizes.includes(item.size)) {
        throw new Error(`Selected size is not available for ${product.name}`);
      }

      return {
        productId: product.id,
        size: item.size,
        qty: item.qty,
        price: product.price,
      } satisfies PricedCheckoutItem;
    })
  );

  const totalRupees = pricedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalPaise = Math.round(totalRupees * 100);

  return {
    pricedItems,
    totalRupees,
    totalPaise,
  };
}