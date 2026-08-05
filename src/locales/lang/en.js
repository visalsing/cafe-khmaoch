// src/locales/en.js
// English translations. Add new keys here first — this file is the fallback
// used whenever a key is missing from another language file.

const en = {
  // ---- Sidebar / nav ----
  dashboard: "Dashboard",
  settings: "Settings",
  orderBooking: "Order Booking",

  // ---- Header ----
  searchAnything: "Search Anything",
  welcomeBack: "Welcome back",

  // ---- Settings page ----
  systemPreferences: "System preferences and profile settings.",
  appearance: "Appearance",
  appearanceDescription: "Choose how the dashboard looks on this device.",
  light: "Light",
  lightDescription: "Bright background, dark text.",
  dark: "Dark",
  darkDescription: "Dark background, easy on the eyes at night.",
  system: "System",
  systemDescription: "Match your device's appearance setting.",
  language: "Language",
  languageDescription: "Choose the language used throughout the dashboard.",

  // ---- Stock Allocation ----
  sa_title_1: 'Search "Stock Allocation"',
  sa_cap_1: "Stock Allocation | Image 1",
  click_on_icon: "Click on icon",
  sa_des_1:
    'Then, click on the search bar and type "Stock Allocation" to search. When the menu is displayed, we click on it.',

  sa_cap_2: "Stock Allocation | Image 2",
  sa_title_2: "Unallocated Tab",
  sa_des2_txt1: 'Tab "Unallocated" shows the order which is shortage.',
  sa_des2_txt2:
    "If we want to make it allocated (Unallocated to Allocated), we need to:",
  sa_des2_txt3: "Select one row by clicking on it (it will highlight blue).",
  sa_des2_txt4: 'And then click on button "Allocation"',

  sa_cap_3: "Stock Allocation | Image 3",
  sa_title_3: "Allocated Tab",
  sa_des3_txt1: 'Tab "Allocated" shows the order which is enough.',
  sa_des3_txt2:
    "If we want to make it unallocated (Allocated to Unallocated), we need to:",
  sa_des3_txt3: "Select one row by clicking on it (it will highlight blue).",
  sa_des3_txt4: 'And then click on button "Unallocation"',

  sa_cap_4: "Stock Allocation | Image 4",
  sa_title_4: "Confirm Order Reserve",
  sa_des4_txt1: 'If it is allocated, we see it in a table of tab "Allocated".',
  sa_des4_txt2:
    'If it is unallocated, we see it in a table of tab "Unallocated".',

  tab_allocate_text: "Shows sales orders that have sufficient stock.",
  attached_photos: "Attached Photos",

  stock_allocation: "Stock Allocation",
  stock_allocation_overview: "Stock Allocation Overview",
  stock_allocation_txt:
    "Stock Allocation is where we manage sales orders based on stock availability (shortage vs. sufficient stock).",
  tab_allocated: 'Tab "Allocated":',
  tab_allocated_text: "Shows sales orders that have sufficient stock.",
  tab_unallocated: 'Tab "Unallocated":',
  tab_unallocated_text: "Shows sales orders with stock shortages.",

  editing_sale_order: "Editing Sale Order",
  editing_sale_order_txt1: "To edit a sales order, it must be set to",
  unallocated: "unallocated",
  first: " first.",
  editing_sale_order_txt2: "Afterwards, the sales order will appear under ",
  option_order_editing: "Option Order Editing.",
  steps_edit_sale_order: "Steps to edit a sales order:",
  navigate_to: "Navigate to ",
  change_the_sales_order_status: "Change the sales order status from ",
  unallocated_capital: "Unallocated",
  allocated_capital: "Allocated",
  view_as_slide: "View as Slide",
  export_as_powerpoint: "Export as PowerPoint",
  export_as_pdf: "Export as PDF",

  // Order Editing
  oe_title_1: 'Search "Order Editing"',
  oe_cap_1: "Order Editing | Image 1",
  oe_des_1:
    'Then, click on the search bar and type "Order Editing" to search. When the menu is displayed, we click on it.',

  oe_cap_2: "Order Editing | Image 2",
  oe_cap_3: "Order Editing | Image 3",
  oe_cap_4: "Order Editing | Image 4",
  oe_cap_5: "Order Editing | Image 5",
  oe_cap_6: "Order Editing | Image 6",

  order_editing: "Order Editing",
  order_editing_overview: "Order Editing Overview",
};

export default en;
