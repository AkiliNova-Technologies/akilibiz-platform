import { HostedCataloguePage } from "@/components/akilibiz/products/hosted-catalogue-page";

export default async function ProductsPage({
  searchParams,
}:{
  searchParams:Promise<{page?:string|string[];q?:string|string[]}>;
}) {
  return <HostedCataloguePage view="products" searchParams={await searchParams}/>;
}
