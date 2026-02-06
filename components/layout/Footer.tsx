import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#1a1a1a] text-white pt-12 pb-6 mt-auto border-t border-orange-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* 1. MARCA */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-bold mb-4 text-[#ff6d22] font-playfair">Pide<span className="italic text-white">&</span>Come</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              La mejor experiencia gastronómica llevada directamente a tu mesa. Calidad, sabor y pasión en cada plato.
            </p>
          </div>

          {/* 2. ENLACES */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Enlaces</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-[#ff6d22] transition-colors">Inicio</Link></li>
              <li><Link href="/products" className="hover:text-[#ff6d22] transition-colors">Nuestro Menú</Link></li>
              <li><Link href="/nosotros" className="hover:text-[#ff6d22] transition-colors">Nosotros</Link></li>
              <li><Link href="/contacto" className="hover:text-[#ff6d22] transition-colors">Contacto</Link></li>
            </ul>
          </div>

           {/* 3. CONTACTO */}
           <div>
            <h4 className="text-lg font-bold mb-4 text-white">Contacto</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#ff6d22] mt-0.5" />
                <span>Calle 123 #45-67,<br/>Barrio Central</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#ff6d22]" />
                <span>+57 300 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#ff6d22]" />
                <span>contacto@pideycome.com</span>
              </li>
            </ul>
          </div>

          {/* 4. SÍGUENOS (LO QUE FALTABA) */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Síguenos</h4>
            <p className="text-gray-400 text-sm mb-4">
              Entérate de nuestras promociones y nuevos platos.
            </p>
            <div className="flex gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" 
                 className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all transform hover:-translate-y-1">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" 
                 className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#E4405F] hover:text-white transition-all transform hover:-translate-y-1">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" 
                 className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white transition-all transform hover:-translate-y-1">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

        </div>

        <hr className="border-gray-800 mb-6" />

        {/* COPYRIGHT */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Pide y Come. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;