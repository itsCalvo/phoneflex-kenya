'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductGallery({images,name}:{images:string[];name:string}){
 const gallery=Array.from(new Set((images||[]).filter(Boolean)));
 const [active,setActive]=useState(0);
 if(!gallery.length) return <div className="detail-image"><img src="/phone-placeholder.svg" alt={name}/><span className="detail-image-caption">Product image for illustration</span></div>;
 const move=(direction:number)=>setActive((current)=>(current+direction+gallery.length)%gallery.length);
 return <div className="product-gallery">
  <div className="product-gallery-main">
   <img src={gallery[active]} alt={name+' product view '+(active+1)} />
   {gallery.length>1&&<><button type="button" className="gallery-nav gallery-prev" aria-label="Previous image" onClick={()=>move(-1)}><ChevronLeft size={19}/></button><button type="button" className="gallery-nav gallery-next" aria-label="Next image" onClick={()=>move(1)}><ChevronRight size={19}/></button></>}
  </div>
  {gallery.length>1&&<><div className="product-gallery-thumbs">{gallery.map((src,index)=><button type="button" key={src} className={'product-gallery-thumb '+(active===index?'active':'')} onClick={()=>setActive(index)} aria-label={'Show image '+(index+1)}><img src={src} alt=""/></button>)}</div><span className="product-gallery-count">Image {active+1} of {gallery.length}</span></>}
 </div>;
}