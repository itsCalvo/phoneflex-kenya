export const money=(n:number|null|undefined)=>n==null?'Price on request':new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(n);
