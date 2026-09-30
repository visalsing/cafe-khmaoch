import React, { useState, useEffect } from "react";
import {
  Coffee,
  Sun,
  Moon,
  ShoppingBag,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Search,
  MapPin,
  Phone,
  Plus,
  Check,
  // Instagram,
  // Facebook,
  // Twitter,
  ArrowRight,
} from "lucide-react";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(2);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cartItems, setCartItems] = useState([1, 3]);
  const [notification, setNotification] = useState("");

  // Toggle Dark Mode class on root html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const categories = [
    "All",
    "Specialty Coffee",
    "Artisanal Teas",
    "Cold Brews",
    "Fresh Pastries",
  ];

  const products = [
    {
      id: 1,
      title: "Velvet Nitro Cold Brew",
      category: "Cold Brews",
      price: "$5.50",
      rating: 4.9,
      reviews: 142,
      img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
      badge: "Customer Favorite",
      desc: "Infused with nitrogen for a velvety smooth texture and rich crema.",
    },
    {
      id: 2,
      title: "Signature Caramel Macchiato",
      category: "Specialty Coffee",
      price: "$6.00",
      rating: 4.8,
      reviews: 98,
      img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80",
      badge: "Bestseller",
      desc: "Fresh espresso layered with steamed milk, vanilla syrup, and caramel drizzle.",
    },
    {
      id: 3,
      title: "Ceremonial Grade Matcha Latte",
      category: "Artisanal Teas",
      price: "$6.50",
      rating: 5.0,
      reviews: 76,
      img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
      badge: "Organic",
      desc: "Authentic Japanese green tea whisked with creamy oat milk.",
    },
    {
      id: 4,
      title: "Gluten-Free Almond Croissant",
      category: "Fresh Pastries",
      price: "$4.75",
      rating: 4.7,
      reviews: 210,
      img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
      badge: "Freshly Baked",
      desc: "Flaky, buttery pastry filled with sweet almond frangipane.",
    },
    {
      id: 5,
      title: "Single Origin Ethiopian Yirgacheffe",
      category: "Specialty Coffee",
      price: "$4.80",
      rating: 4.9,
      reviews: 64,
      img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
      badge: "Limited Roast",
      desc: "Floral notes with bright bergamot and subtle jasmine undertones.",
    },
    {
      id: 6,
      title: "Wild Berry Hibiscus Iced Tea",
      category: "Artisanal Teas",
      price: "$5.00",
      rating: 4.6,
      reviews: 89,
      img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
      badge: "Refreshing",
      desc: "Brewed hibiscus flowers infused with fresh berries and wild mint.",
    },
  ];

  const stats = [
    {
      label: "Artisanal Coffee Servings",
      value: "120K+",
      change: "+22%",
      positive: true,
    },
    {
      label: "Local Farm Partners",
      value: "18 Farms",
      change: "Direct Trade",
      positive: true,
    },
    {
      label: "Cozy Lounge Rating",
      value: "4.9/5",
      change: "99% Love",
      positive: true,
    },
    {
      label: "Daily Fresh Pastries",
      value: "25+ Sorts",
      change: "Baked Hourly",
      positive: true,
    },
  ];

  const filteredProducts = products.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (id, title) => {
    if (!cartItems.includes(id)) {
      setCartItems([...cartItems, id]);
      setCartCount(cartCount + 1);
    }
    showNotification(`Added "${title}" to your order! ☕`);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 font-sans">
      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <Coffee className="w-5 h-5 text-amber-300" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        cartCount={cartCount}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Mobile Menu Drawer */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-6">
        {/* Interactive Hero Slider */}
        <HeroSlider />

        {/* Stats Section */}
        <StatsSection stats={stats} />

        {/* Shop Menu Section */}
        <ShopMenu
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredProducts={filteredProducts}
          cartItems={cartItems}
          handleAddToCart={handleAddToCart}
        />

        {/* About Section */}
        <AboutSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function Navbar({ darkMode, setDarkMode, cartCount, setMobileMenuOpen }) {
  return (
    <header className="sticky top-0 z-40 bg-stone-100/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3 cursor-pointer">
          <div className="w-11 h-11 rounded-2xl bg-amber-800 flex items-center justify-center text-white shadow-lg shadow-amber-900/20">
            <Coffee className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-800 to-amber-600 dark:from-amber-400 dark:to-amber-200 bg-clip-text text-transparent">
              Bean & Blossom
            </span>
            <span className="block text-xs text-stone-500 dark:text-stone-400 font-medium tracking-widest uppercase">
              Artisanal Cafe & Roastery
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-600 dark:text-stone-300">
          <a
            href="#hero"
            className="hover:text-amber-800 dark:hover:text-amber-400 transition-colors"
          >
            Home
          </a>
          <a
            href="#menu"
            className="hover:text-amber-800 dark:hover:text-amber-400 transition-colors"
          >
            Menu & Drinks
          </a>
          <a
            href="#about"
            className="hover:text-amber-800 dark:hover:text-amber-400 transition-colors"
          >
            Our Vibe
          </a>
          <a
            href="#contact"
            className="hover:text-amber-800 dark:hover:text-amber-400 transition-colors"
          >
            Visit Us
          </a>
          <button
            onClick={() => navigate("/settings-page")}
            className={`transition-colors text-left cursor-pointer ${
              location.pathname === "/settings-page"
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            Settings
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className={`transition-colors text-left cursor-pointer ${
              location.pathname === "/dashboard"
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            Dashboard
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition"
            aria-label="Toggle Theme"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-stone-700" />
            )}
          </button>

          <div className="relative cursor-pointer p-2.5 rounded-xl bg-amber-800 text-white shadow-md shadow-amber-900/20 hover:bg-amber-900 transition flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-900 dark:bg-amber-400 dark:text-stone-900 text-white text-xs font-bold flex items-center justify-center border-2 border-stone-100 dark:border-stone-900">
                {cartCount}
              </span>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2.5 rounded-xl bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ isOpen, onClose, darkMode, setDarkMode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-80 bg-stone-100 dark:bg-stone-900 h-full shadow-2xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-800 flex items-center justify-center text-white">
                <Coffee className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-stone-900 dark:text-white">
                Bean & Blossom
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="mt-8 flex flex-col space-y-5 text-lg font-medium text-stone-700 dark:text-stone-200">
            <a
              href="#hero"
              onClick={onClose}
              className="hover:text-amber-800 dark:hover:text-amber-400"
            >
              Home
            </a>
            <a
              href="#menu"
              onClick={onClose}
              className="hover:text-amber-800 dark:hover:text-amber-400"
            >
              Menu & Drinks
            </a>
            <a
              href="#about"
              onClick={onClose}
              className="hover:text-amber-800 dark:hover:text-amber-400"
            >
              Our Vibe
            </a>
            <a
              href="#contact"
              onClick={onClose}
              className="hover:text-amber-800 dark:hover:text-amber-400"
            >
              Visit Us
            </a>
          </nav>
        </div>

        <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <span className="text-sm font-medium text-stone-500">
            Dark Appearance
          </span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-stone-700" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroSlider() {
  const slides = [
    {
      title: "Artisanal Specialty Coffee, Crafted with Passion",
      subtitle:
        "Experience single-origin beans roasted to perfection, brewed with precision daily.",
      image:
        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=80",
      badge: "Freshly Roasted Today",
    },
    {
      title: "Cozy Corners & Relaxing Lounge Vibe",
      subtitle:
        "Your favorite neighborhood sanctuary for reading, working, and catching up with friends.",
      image:
        "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1600&q=80",
      badge: "Warm & Welcoming Atmosphere",
    },
    {
      title: "Handcrafted Drinks & Fresh Pastries",
      subtitle:
        "From velvety nitro cold brews to flaky artisanal croissants baked every morning.",
      image:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80",
      badge: "Daily Baked Goods",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto slide effect every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? slides.length - 1 : prevIndex - 1,
    );
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  return (
    <section
      id="hero"
      className="relative rounded-3xl overflow-hidden shadow-2xl bg-stone-900 min-h-[520px] sm:min-h-[600px] flex items-center"
    >
      {/* Slider Background Image with Overlay */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover transform scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/60 to-transparent" />
        </div>
      ))}

      {/* Content Container */}
      <div className="relative z-20 max-w-3xl px-6 sm:px-12 py-16 text-white space-y-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md">
          <Coffee className="w-4 h-4" />
          <span>{slides[currentIndex].badge}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
          {slides[currentIndex].title}
        </h1>

        <p className="text-stone-300 text-base sm:text-lg max-w-xl font-normal leading-relaxed">
          {slides[currentIndex].subtitle}
        </p>

        <div className="flex flex-wrap gap-4 pt-2">
          <a
            href="#menu"
            className="px-8 py-4 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-semibold shadow-lg shadow-amber-900/30 transition flex items-center space-x-2 text-base"
          >
            <span>Explore Menu</span>
            <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#about"
            className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold backdrop-blur-md border border-white/20 transition text-base"
          >
            Our Story
          </a>
        </div>
      </div>

      {/* Left / Right Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-stone-950/50 hover:bg-amber-800 text-white backdrop-blur-md border border-white/10 transition shadow-lg"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-stone-950/50 hover:bg-amber-800 text-white backdrop-blur-md border border-white/10 transition shadow-lg"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Clickable Pagination Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 bg-stone-950/40 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all rounded-full ${
              currentIndex === index
                ? "w-8 h-3 bg-amber-500"
                : "w-3 h-3 bg-white/50 hover:bg-white"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function StatsSection({ stats }) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition space-y-2"
        >
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-xs sm:text-sm font-medium text-stone-500 dark:text-stone-400">
            {stat.label}
          </div>
          <div className="inline-flex items-center space-x-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg">
            <span>{stat.change}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function ShopMenu({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  filteredProducts,
  cartItems,
  handleAddToCart,
}) {
  return (
    <section id="menu" className="space-y-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-400">
            Handcrafted Selection
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white mt-1">
            Our Cafe Menu & Specialties
          </h2>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search coffee, tea, pastries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800 dark:focus:ring-amber-400 transition"
          />
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition shadow-sm ${
              selectedCategory === cat
                ? "bg-amber-800 text-white shadow-amber-900/20"
                : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-amber-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <Coffee className="w-12 h-12 text-stone-400 mx-auto mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">
            No menu items found
          </h3>
          <p className="text-sm text-stone-500 mt-1">
            Try adjusting your search or category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map((item) => {
            const inCart = cartItems.includes(item.id);
            return (
              <div
                key={item.id}
                className="group rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-64 overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <span className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-stone-900/80 backdrop-blur-md text-white text-xs font-bold">
                      {item.badge}
                    </span>
                    <div className="absolute top-4 right-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center space-x-1 text-xs font-bold text-stone-900 dark:text-white shadow">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{item.rating}</span>
                      <span className="text-stone-400 text-[10px]">
                        ({item.reviews})
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                      {item.category}
                    </span>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-amber-400 transition">
                      {item.title}
                    </h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-center justify-between">
                  <span className="text-2xl font-black text-stone-900 dark:text-white">
                    {item.price}
                  </span>
                  <button
                    onClick={() => handleAddToCart(item.id, item.title)}
                    className={`px-4 py-3 rounded-2xl font-semibold text-sm transition flex items-center space-x-2 ${
                      inCart
                        ? "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                        : "bg-amber-800 hover:bg-amber-900 text-white shadow-md shadow-amber-900/20"
                    }`}
                  >
                    {inCart ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Order Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AboutSection() {
  return (
    <section
      id="about"
      className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-10"
    >
      <div className="space-y-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 text-xs font-bold uppercase tracking-widest">
          <Coffee className="w-4 h-4" />
          <span>Our Vibe & Philosophy</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white">
          Where Every Cup Tells a Story of Warmth and Quality
        </h2>

        <p className="text-stone-600 dark:text-stone-300 text-base leading-relaxed">
          At Bean & Blossom, we believe that a great cafe is more than just a
          place to grab caffeine—it’s a sanctuary. From ethically sourced
          organic beans harvested by sustainable farmers to pastries baked fresh
          every sunrise, we craft every detail for your ultimate comfort.
        </p>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <h4 className="font-bold text-stone-900 dark:text-white text-base">
              100% Organic Beans
            </h4>
            <p className="text-xs text-stone-500 mt-1">
              Directly sourced from high-altitude fair-trade estates.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <h4 className="font-bold text-stone-900 dark:text-white text-base">
              Artisanal Pastries
            </h4>
            <p className="text-xs text-stone-500 mt-1">
              Hand-rolled and baked hourly for maximum crispness.
            </p>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-4">
        <img
          src="https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80"
          alt="Cafe Interior"
          className="rounded-3xl object-cover h-72 w-full shadow-lg"
        />
        <img
          src="https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=600&q=80"
          alt="Latte Art"
          className="rounded-3xl object-cover h-72 w-full shadow-lg mt-8"
        />
      </div>
    </section>
  );
}

function Footer() {
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
            {/* <a href="#instagram" className="p-2.5 rounded-xl bg-stone-800 hover:bg-amber-800 text-stone-300 hover:text-white transition">
              <Instagram className="w-4 h-4" />
            </a> */}
            {/* <a href="#facebook" className="p-2.5 rounded-xl bg-stone-800 hover:bg-amber-800 text-stone-300 hover:text-white transition">
              <Facebook className="w-4 h-4" />
            </a> */}
            {/* <a href="#twitter" className="p-2.5 rounded-xl bg-stone-800 hover:bg-amber-800 text-stone-300 hover:text-white transition">
              <Twitter className="w-4 h-4" />
            </a> */}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
            Quick Links
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a href="#hero" className="hover:text-amber-400 transition">
                Home
              </a>
            </li>
            <li>
              <a href="#menu" className="hover:text-amber-400 transition">
                Specialty Menu
              </a>
            </li>
            <li>
              <a href="#about" className="hover:text-amber-400 transition">
                Our Vibe & Story
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:text-amber-400 transition">
                Location & Hours
              </a>
            </li>
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
              <span>+1 (555) 839-2041</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
            Opening Hours
          </h4>
          <ul className="space-y-2.5 text-sm text-stone-400">
            <li className="flex justify-between">
              <span>Mon - Fri:</span>{" "}
              <span className="text-white font-medium">6:30 AM - 8:00 PM</span>
            </li>
            <li className="flex justify-between">
              <span>Sat - Sun:</span>{" "}
              <span className="text-white font-medium">7:30 AM - 9:00 PM</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500">
        <p>
          &copy; {new Date().getFullYear()} Bean & Blossom Cafe. All rights
          reserved.
        </p>
        <p className="mt-2 sm:mt-0">
          Crafted with ❤️ and fresh roasted espresso beans.
        </p>
      </div>
    </footer>
  );
}
