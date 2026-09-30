import React from "react";
import { Coffee, MapPin, Phone, 
  // Instagram, Facebook 
} from "lucide-react";

export default function Footer() {
  return (
    <footer
      id="contact"
      className="bg-stone-900 text-stone-300 pt-16 pb-12 mt-20 border-t border-stone-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-800 flex items-center justify-center text-white">
              <Coffee className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white">Bean & Blossom</span>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed">
            Your neighborhood specialty coffee shop and cozy pastry sanctuary.
            Come for the brews, stay for the warmth.
          </p>
          <div className="flex items-center space-x-3">
            {/* <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="p-2.5 rounded-xl bg-stone-800 hover:bg-amber-800 text-stone-300 hover:text-white transition"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="p-2.5 rounded-xl bg-stone-800 hover:bg-amber-800 text-stone-300 hover:text-white transition"
            >
              <Facebook className="w-4 h-4" />
            </a> */}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
            Quick Links
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li><a href="#hero" className="hover:text-amber-400 transition">Home</a></li>
            <li><a href="#shop" className="hover:text-amber-400 transition">Specialty Menu</a></li>
            <li><a href="#about" className="hover:text-amber-400 transition">Our Vibe & Story</a></li>
            <li><a href="#contact" className="hover:text-amber-400 transition">Location & Hours</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
            Visit Our Lounge
          </h4>
          <ul className="space-y-3 text-sm text-stone-400">
            <li className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <span>742 Evergreen Terrace, Blossom District, CA</span>
            </li>
            <li className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-amber-500 shrink-0" />
              <a href="tel:+15558392041" className="hover:text-amber-400 transition">
                +1 (555) 839-2041
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
            Opening Hours
          </h4>
          <ul className="space-y-2.5 text-sm text-stone-400">
            <li className="flex justify-between">
              <span>Mon - Fri:</span>
              <span className="text-white font-medium">6:30 AM - 8:00 PM</span>
            </li>
            <li className="flex justify-between">
              <span>Sat - Sun:</span>
              <span className="text-white font-medium">7:30 AM - 9:00 PM</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500">
        <p>&copy; {new Date().getFullYear()} Bean & Blossom Cafe. All rights reserved.</p>
        <p className="mt-2 sm:mt-0">Crafted with ❤️ and fresh roasted espresso beans.</p>
      </div>
    </footer>
  );
}