import type { TaxEvidence } from "./tax-management-data";

/** A local product ID is not globally unique across paired desktop sources. */
export function productVatReviewKey(source: string, localProductId: number): string {
  return `${source}:${localProductId}`;
}
export function indexLatestProductVatReviews(reviews: TaxEvidence[]) {
  const indexed=new Map<string,TaxEvidence>();
  for(const review of reviews){
    if(review.productId===undefined || !review.localBusinessPublicId)continue;
    const key=productVatReviewKey(review.localBusinessPublicId,review.productId);
    const previous=indexed.get(key);
    if(!previous || (review.date??"")>(previous.date??""))indexed.set(key,review);
  }
  return indexed;
}
