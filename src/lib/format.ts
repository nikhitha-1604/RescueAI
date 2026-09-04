export function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function compactInr(amount: number) {
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    const formatted = lakhs >= 10 ? lakhs.toFixed(0) : lakhs.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `₹${formatted}L`;
  }
  return inr(amount);
}
