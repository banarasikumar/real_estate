/**
 * Shared currency and formatting utility functions for Customer Web
 */

export function formatPricePill(price: number | string): string {
  if (typeof price === "string") {
    if (price.startsWith("₹") || price.startsWith("$")) return price;
    const num = parseFloat(price.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return price;
    price = num;
  }
  if (typeof price === "number") {
    if (price >= 10000000) {
      const cr = price / 10000000;
      return `₹${cr % 1 === 0 ? cr : cr.toFixed(cr < 10 ? 2 : 1)} Cr`;
    }
    if (price >= 100000) {
      const lac = price / 100000;
      return `₹${lac % 1 === 0 ? lac : lac.toFixed(lac < 10 ? 1 : 0)} L`;
    }
    if (price >= 1000) {
      return `₹${(price / 1000).toFixed(0)}k`;
    }
    return `₹${price.toLocaleString("en-IN")}`;
  }
  return "₹0";
}

export function formatPriceLabel(price?: number): string {
  if (!price || price <= 0) return "";
  if (price >= 10000000) {
    const cr = price / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(cr < 10 ? 1 : 0)} Cr`;
  }
  if (price >= 100000) {
    const lac = price / 100000;
    return `₹${lac % 1 === 0 ? lac : lac.toFixed(0)} L`;
  }
  if (price >= 1000) {
    return `₹${(price / 1000).toFixed(0)}k`;
  }
  return `₹${price.toLocaleString("en-IN")}`;
}
