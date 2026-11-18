'use client';
import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
const items=[
 ['Are all phones shown available to buy?','No. The catalogue contains phone models, while actual availability depends on an active listing from a verified seller with stock. A model without a seller offer is for research only.'],
 ['Does PhoneFlex finance or lend money?','PhoneFlex displays offers from participating providers and helps you contact them. The financing provider makes the approval decision and sets the final terms.'],
 ['Can I pay PhoneFlex directly?','No. Enquiries are handed to the seller or financing provider. Confirm the recipient, device condition, warranty and final amount before making payment.'],
 ['How current are prices and stock?','Seller listings include a last-verified date where available. Always reconfirm price, variant and stock with the seller before travelling or paying.'],
 ['How do I become a seller?','Use the merchant portal to register interest. Seller accounts and listings must be reviewed and verified before being made public.']
];
export default function FAQ(){const [open,setOpen]=useState<number|null>(0);return <section className="faq-section"><div className="section-center"><span className="eyebrow">GOOD TO KNOW</span><h2>Questions before you buy.</h2><p>Understand what PhoneFlex does — and what still needs seller confirmation.</p></div><div className="faq-list">{items.map(([q,a],i)=><div className="faq-item" key={q}><button onClick={()=>setOpen(open===i?null:i)} aria-expanded={open===i}><b>{q}</b><ChevronDown className={open===i?'faq-chevron open':'faq-chevron'}/></button>{open===i&&<p>{a}</p>}</div>)}</div></section>}
