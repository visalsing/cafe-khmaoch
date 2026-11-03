import React from "react";
import { Coffee, MapPin, Phone } from "lucide-react";
import logoImg from "../../assets/logo/cafe-khmaoch2-rmbg.png";

// Temporary data until the footer API/database is ready.
// Later, replace this with data returned by your backend.
// const FOOTER_DATA = {
//   name: "Café ខ្មោច",
//   description:
//     "Your neighborhood specialty coffee shop and cozy pastry sanctuary. Come for the brews, stay for the warmth.",
//   address: "742 Evergreen Terrace, Blossom District, CA",
//   phone: "+1 (555) 839-2041",
//   phoneLink: "+15558392041",
//   hours: [
//     { days: "Mon - Fri", time: "6:30 AM - 8:00 PM" },
//     { days: "Sat - Sun", time: "7:30 AM - 9:00 PM" },
//   ],
// };

// const QUICK_LINKS = [
//   { href: "#hero", label: "Home" },
//   { href: "#shop", label: "Specialty Menu" },
//   { href: "#about", label: "Our Vibe & Story" },
//   { href: "#contact", label: "Location & Hours" },
// ];

const FOOTER_DATA = {
  name: "Café ខ្មោច",
  description:
    "A little mysterious, a lot of comfort. Café ខ្មោច is your cozy corner for good coffee, refreshing drinks, delicious treats, and moments worth staying for.",
  address: "Your café's actual address",
  phone: "Your phone number",
  phoneLink: "",
  email: "",
  hours: [
    { days: "Monday - Friday", time: "6:30 AM - 8:00 PM" },
    { days: "Saturday - Sunday", time: "7:30 AM - 9:00 PM" },
  ],
};

const QUICK_LINKS = [
  { href: "#hero", label: "Home" },
  { href: "#shop", label: "Our Menu" },
  { href: "#about", label: "About Us" },
  { href: "#contact", label: "Contact Us" },
];

export default function Footer() {
  const footer = FOOTER_DATA;

  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 mt-20 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-accent-800 flex items-center justify-center overflow-hidden p-1">
              <img
                src={logoImg}
                alt="Cafe Khmaoch Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <span className="font-bold text-lg text-white">
              {/* <Coffee className="w-5 h-5" />  */}
              {footer.name}
            </span>
          </div>

          <p className="text-sm text-stone-400 leading-relaxed">
            {footer.description}
          </p>

          <div className="flex items-center space-x-3">
            {/* Add social media links when available. */}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
            {/* Quick Links */}
            Explore
          </h4>

          <ul className="space-y-2.5 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="hover:text-accent-400 transition"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Location & Contact */}
        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
            {/* Visit Our Lounge */}
            Find Us
          </h4>

          <ul className="space-y-3 text-sm text-stone-400">
            <li className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-accent-500 shrink-0 mt-0.5" />
              <span>{footer.address}</span>
            </li>

            <li className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-accent-500 shrink-0" />

              <a
                href={`tel:${footer.phoneLink}`}
                className="hover:text-accent-400 transition"
              >
                {footer.phone}
              </a>
            </li>
          </ul>
        </div>

        {/* Opening Hours */}
        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
            Opening Hours
          </h4>

          <ul className="space-y-2.5 text-sm text-stone-400">
            {footer.hours.map((hour) => (
              <li key={hour.days} className="flex justify-between gap-3">
                <span>{hour.days}:</span>
                <span className="text-white font-medium text-right">
                  {hour.time}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500">
        {/* <p>
          &copy; {new Date().getFullYear()} {footer.name} Cafe. All rights
          reserved.
        </p>

        <p className="mt-2 sm:mt-0">
          Crafted with ❤️ and fresh roasted espresso beans.
        </p> */}
        <p>
          &copy; {new Date().getFullYear()} {footer.name}. All rights reserved.
        </p>

        <p className="mt-2 sm:mt-0">
          Made with care, served with a little mystery. ☕❤️👻
        </p>
      </div>
    </footer>
  );
}
