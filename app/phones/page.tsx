import PhoneFinder from '@/components/PhoneFinder';
import {getProducts} from '@/lib/data';
export const dynamic='force-dynamic';
export const metadata={title:'Find Your Phone | PhoneFlex Kenya',description:'Explore phones by category, budget, brand, RAM, storage and payment options. Compare phone models and seller offers in Kenya.'};
export default async function PhonesPage(){const products=await getProducts();return <PhoneFinder products={products}/>;}
