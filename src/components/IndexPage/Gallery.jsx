import React, { useState } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { Sparkles, Maximize2, X, Filter } from "lucide-react";

// Static aesthetic gallery items with categories
const GALLERY_ITEMS = [
  {
    id: 1,
    title: { en: "Ghostly Ambiance & Warm Lighting", km: "បរិយាកាសដ៏ទាក់ទាញ និងពន្លឺកក់ក្តៅ" },
    category: "ambiance",
    img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
    tag: { en: "Cozy Corner", km: "ជ្រុងកក់ក្តៅ" },
  },
  {
    id: 2,
    title: { en: "Signature Black Charcoal Latte", km: "កាហ្វេខ្មៅពិសេសប្រចាំហាង" },
    category: "drinks",
    img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
    tag: { en: "Best Seller", km: "លក់ដាច់បំផុត" },
  },
  {
    id: 3,
    title: { en: "Handcrafted Croissants & Pastries", km: "នំខ្យូសង់ និងនំអូប៊ី" },
    category: "pastries",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80",
    tag: { en: "Freshly Baked", km: "ឆ្អិនថ្មីៗ" },
  },
  {
    id: 4,
    title: { en: "Night Vibe & Neon Aesthetic", km: "បរិយាកាសពេលយប់ដ៏ស្រស់ស្អាត" },
    category: "night",
    img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    tag: { en: "Night Mood", km: "អារម្មណ៍ពេលយប់" },
  },
  {
    id: 5,
    title: { en: "Barista Crafting Art", km: "សិល្បៈនៃការឆុងកាហ្វេរបស់បារីស្តា" },
    category: "ambiance",
    img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    tag: { en: "Craftmanship", km: "ជំនាញវិជ្ជាជីវៈ" },
  },
  {
    id: 6,
    title: { en: "Matcha Ghost Special", km: "ម៉ាត់ឆាពិសេសប្រចាំហាង" },
    category: "drinks",
    img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1200&q=80",
    tag: { en: "Refreshing", km: "ស្រស់ស្រាយ" },
  },
];

export default function Gallery() {
  const { language, t } = useLanguage();
  const activeLanguage = language || "en";

  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);

  // Filter categories
  const categories = [
    { id: "all", label: { en: "All Photos", km: "រូបភាពទាំងអស់" } },
    { id: "ambiance", label: { en: "Ambiance", km: "បរិយាកាសហាង" } },
    { id: "drinks", label: { en: "Signature Drinks", km: "ភេសជ្ជៈពិសេស" } },
    { id: "pastries", label: { en: "Pastries", km: "នំផ្សេងៗ" } },
    { id: "night", label: { en: "Night Vibes", km: "ពេលយប់" } },
  ];

  const filteredItems = activeCategory === "all"
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <section id="gallery" className="space-y-10 py-6">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t("gallery_badge") || "Visual Journey"}</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white">
          {t("gallery_title") || "Explore Café ខ្មោច Vibe"}
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">
          {t("gallery_subtitle") || "Immerse yourself in our aesthetic atmosphere, signature drinks, and cozy corners."}
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === cat.id
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-105"
                : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-amber-500"
            }`}
          >
            {cat.label[activeLanguage] || cat.label.en}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedImage(item)}
            className="group relative h-72 rounded-3xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-sm border border-stone-200/60 dark:border-stone-800 cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-1.5"
          >
            {/* Image */}
            <img
              src={item.img}
              alt={item.title[activeLanguage] || item.title.en}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

            {/* Tag Badge */}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white rounded-lg border border-white/10 shadow-sm">
                {item.tag[activeLanguage] || item.tag.en}
              </span>
            </div>

            {/* Zoom Icon Action */}
            <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Maximize2 className="w-4 h-4" />
            </div>

            {/* Title / Description at Bottom */}
            <div className="absolute bottom-0 inset-x-0 p-6 transform transition-transform duration-300">
              <h3 className="text-white font-bold text-base sm:text-lg drop-shadow-sm">
                {item.title[activeLanguage] || item.title.en}
              </h3>
              <p className="text-stone-300 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {t("click_to_expand") || "Click to view full image"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal Preview */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-4xl w-full bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center">
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black text-white transition-colors cursor-pointer border border-white/10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Image Container */}
            <div className="w-full max-h-[75vh] flex items-center justify-center bg-black overflow-hidden">
              <img
                src={selectedImage.img}
                alt={selectedImage.title[activeLanguage] || selectedImage.title.en}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>

            {/* Modal Footer Info */}
            <div className="w-full p-6 bg-stone-900 flex items-center justify-between border-t border-stone-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  {selectedImage.tag[activeLanguage] || selectedImage.tag.en}
                </span>
                <h3 className="text-white font-bold text-lg mt-0.5">
                  {selectedImage.title[activeLanguage] || selectedImage.title.en}
                </h3>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {t("close") || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}