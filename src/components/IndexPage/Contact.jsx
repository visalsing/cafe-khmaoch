import React, { useState, useEffect } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import emailjs from "emailjs-com";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { assetUrl } from "../../services/api";

export default function Contact() {
  const { language, t } = useLanguage();
  const { currentUser } = useAuth(); // Logged-in user context

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    title: "", // Dynamic Subject/Title state
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [userLocation, setUserLocation] = useState("Detecting location...");

  // Auto-fill details if user is logged in
  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        name:
          prev.name ||
          `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
          currentUser.username ||
          "",
        email: prev.email || currentUser.email || "",
      }));
    }
  }, [currentUser]);

  // Detect Visitor Location (City, Region, Country)
  useEffect(() => {
    let active = true;

    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          if (data && data.city && data.country_name) {
            const locString = `${data.city}, ${data.region || ""}, ${data.country_name}`.replace(
              ", ,",
              ","
            );
            setUserLocation(locString);
          } else {
            setUserLocation("Phnom Penh, Cambodia");
          }
        }
      })
      .catch(() => {
        if (active) setUserLocation("Cambodia");
      });

    return () => {
      active = false;
    };
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage({ type: "", text: "" });

    const SERVICE_ID = "service_qcca3us";
    const TEMPLATE_ID = "template_qsohmya";
    const PUBLIC_KEY = "Sv3WEfeCcuUwX3lsu";

    // Format current Cambodian local date & time
    const cambodiaTime = new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Phnom_Penh",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    // Sender Profile Avatar (if available)
    const senderAvatar = currentUser?.avatar
      ? assetUrl(currentUser.avatar)
      : "https://via.placeholder.com/150?text=User";

    // EXACT KEYS MATCHING YOUR EMAILJS TEMPLATE
    const templateParams = {
      from_name: formData.name,       // Maps to {{from_name}}
      from_email: formData.email,      // Maps to {{from_email}} in Reply-To
      name: formData.name,            // Maps to {{name}} in Email Body
      title: formData.title || "Inquiry", // Maps to {{title}} in Subject
      message: formData.message,      // Maps to {{message}}
      time: cambodiaTime,             // Maps to {{time}}
      location: userLocation,         // Maps to {{location}}
      avatar_url: senderAvatar,       // Maps to {{avatar_url}}
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY).then(
      () => {
        setSubmitting(false);
        setStatusMessage({
          type: "success",
          text: "Your message has been successfully sent to Café ខ្មោច!",
        });
        setFormData((prev) => ({
          name: currentUser ? prev.name : "",
          email: currentUser ? prev.email : "",
          title: "",
          message: "",
        }));
      },
      (error) => {
        setSubmitting(false);
        setStatusMessage({
          type: "error",
          text: "Failed to send message. Please try again later.",
        });
        console.error("EmailJS Error:", error);
      }
    );
  };

  return (
    <form
      onSubmit={handleSendEmail}
      className="bg-stone-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-4"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-stone-900 dark:text-white">
          {t("send_us_a_message") || "Send us a Message"}
        </h3>
        <p className="text-xs text-stone-500">
          Have any questions or feedback? Drop us a line below.
        </p>
      </div>

      {statusMessage.text && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Name and Email Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
            Your Name
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Visalsing"
            className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-stone-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
            Your Email
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            placeholder="example@gmail.com"
            className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-stone-900 dark:text-white"
          />
        </div>
      </div>

      {/* Subject / Title Input Field */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
          Subject / Title
        </label>
        <input
          type="text"
          name="title"
          required
          value={formData.title}
          onChange={handleInputChange}
          placeholder="e.g., Table Reservation or General Question"
          className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-stone-900 dark:text-white"
        />
      </div>

      {/* Message Textarea */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
          Message
        </label>
        <textarea
          name="message"
          required
          rows="3"
          value={formData.message}
          onChange={handleInputChange}
          placeholder="How can we help you?"
          className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-stone-900 dark:text-white resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
      >
        <Send className="w-4 h-4" />
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}