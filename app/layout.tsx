import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
export const metadata:Metadata={title:'PhoneFlex Kenya | Find your phone. Choose how to pay.',description:'Compare smartphones from Kenyan sellers. Shop with cash or explore flexible instalment options. Enquire directly on WhatsApp.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Header/><main>{children}</main><Footer/></body></html>}
