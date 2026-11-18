import Catalogue from '@/components/Catalogue';
import { getProducts } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function PhonesPage() {
  const products = await getProducts();
  return (
    <div className="container">
      <Catalogue products={products} />
    </div>
  );
}
