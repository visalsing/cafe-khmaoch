// src/locales/km.js
// Khmer translations. Keys must match en.js — if a key is missing here,
// the app automatically falls back to English for it.

const km = {
  // ---- Sidebar / nav ----
  dashboard: "ផ្ទាំងគ្រប់គ្រង",
  settings: "ការកំណត់",
  orderBooking: "កក់ការបញ្ជាទិញ",

  // ---- Header ----
  searchAnything: "ស្វែងរកអ្វីក៏បាន",
  welcomeBack: "សូមស្វាគមន៍មកវិញ",

  // ---- Settings page ----
  systemPreferences: "ការកំណត់ប្រព័ន្ធ និងព័ត៌មានប្រវត្តិរូប។",
  appearance: "រូបរាង",
  appearanceDescription: "ជ្រើសរើសរបៀបដែលផ្ទាំងគ្រប់គ្រងបង្ហាញនៅលើឧបករណ៍នេះ។",
  light: "ភ្លឺ",
  lightDescription: "ផ្ទៃខាងក្រោយភ្លឺ អក្សរងងឹត។",
  dark: "ងងឹត",
  darkDescription: "ផ្ទៃខាងក្រោយងងឹត ស្រួលភ្នែកនៅពេលយប់។",
  system: "ប្រព័ន្ធ",
  systemDescription: "ផ្គូផ្គងជាមួយការកំណត់រូបរាងឧបករណ៍របស់អ្នក។",
  language: "ភាសា",
  languageDescription: "ជ្រើសរើសភាសាដែលប្រើនៅទូទាំងផ្ទាំងគ្រប់គ្រង។",

  // ---- Stock Allocation ----
  sa_title_1: 'ស្វែងរក "Stock Allocation"',
  sa_cap_1: "Stock Allocation | រូបភាពទី១",
  click_on_icon: "ចុចលើ icon",
  sa_des_1:
    'បន្ទាប់មកចុចនៅលើ search bar និងវាយថា "Stock Allocation" ដើម្បីស្វែងរក។​ នៅពេលម៉ឺនុយត្រូវបានបង្ហាញ ពួកយើងចុចលើវា។',

  sa_cap_2: "Stock Allocation | រូបភាពទី២",
  sa_title_2: "Unallocated Tab",
  sa_des2_txt1: 'Tab "Unallocated" បង្ហាញអំពី order ណាដែលខ្វះ។',
  sa_des2_txt2:
    "ប្រសិនបើពួកយើងចង់ធ្វើឲ្យវា allocated (Unallocated ទៅជា Allocated) ពួកយើងត្រូវ៖",
  sa_des2_txt3: "ជ្រើសរើសជួរដេកមួយដោយចុចលើវា (វានឹងហាយលាយពណ៌ខៀវ)។",
  sa_des2_txt4: 'បន្ទាប់មកចុចលើប៊ូតុង "Allocation"។',

  sa_cap_3: "Stock Allocation | រូបភាពទី៣",
  sa_title_3: "Allocated Tab",
  sa_des3_txt1: 'Tab "Allocated" បង្ហាញពី​ order ណាដែលមានចំនួនគ្រប់។',
  sa_des3_txt2:
    "ប្រសិនបើយើងចង់ធ្វើឲ្យវា unallocated (Allocated ទៅជា Unallocated) ពួកយើងត្រូវ៖",
  sa_des3_txt3: "ជ្រើសរើសជួរដោយមួយដោយចុចលើវា (វានឹងហាយឡាយពណ៌ខៀវ)។",
  sa_des3_txt4: 'និងបន្ទាប់មកចុចលើប៊ូតុង "Unallocation"។',

  sa_cap_4: "Stock Allocation | រូបភាពទី៤",
  sa_title_4: "Confirm Order Reserve",
  sa_des4_txt1: 'ប្រសិនបើវា allocated នោះពួកយើងឃើញវានៅក្នុងតារាងនៃtab “Allocated”។',
  sa_des4_txt2:
    'ប្រសិនបើវា unallocated នោះពួកយើងឃើញវានៅក្នុងតារាងនៃtab “Unallocated”។',

  tab_allocate_text: "បង្ហាញអំពី sale orders ដែលមានស្ដុកគ្រប់ចំនួន។",
  attached_photos: "រូបភាពដែលភ្ជាប់ជាមួយ",

  stock_allocation: "Stock Allocation",
  stock_allocation_overview: "Stock Allocation Overview",
  stock_allocation_txt:
    "Stock Allocation គឺជាកន្លែងដែលយើងគ្រប់គ្រងទៅលើ sales orders ដោយផ្អែកលើ stock availability (stock ដែលមិនគ្រប់និងគ្រប់)។",
  tab_allocated: 'Tab "Allocated":',
  tab_allocated_text: "បង្ហាញពី sales orders ដែលមាន stock គ្រប់ចំនួន។",
  tab_unallocated: 'Tab "Unallocated":',
  tab_unallocated_text: "បង្ហាញពី sales orders ដែលមាន stock មិនគ្រប់ចំនួន។",

  editing_sale_order: "Editing Sale Order",
  editing_sale_order_txt1: "ដើម្បីកែ sales order បាន វាត្រូវតែជា",
  unallocated: " unallocated ",
  first: "ជាមុនសិន។ ",
  editing_sale_order_txt2: "បន្ទាប់មក sales order នឹងចេញមកនៅក្រោម ",
  option_order_editing: "Option Order Editing។",
  steps_edit_sale_order: "ជំហានedit លើ sales order៖",
  navigate_to: "ចូលទៅកាន់ ",
  change_the_sales_order_status: "ប្ដូរ sales order status ពី ",
  unallocated_capital: "Unallocated",
  allocated_capital: "Allocated",
  once_completed_proceed_to: "ពេលធ្វើរួច ចូលទៅកាន់ ",
  view_as_slide: "មើលជាស្លាយដ៍",
  export_as_powerpoint: "នាំចេញជា PowerPoint",
  export_as_pdf: "នាំចេញជា PDF",

  // Order Editing
  oe_title_1: 'ស្វែងរក "Order Editing"',
  oe_cap_1: "Order Editing | រូបភាពទី១",
  oe_des_1:
    'បន្ទាប់មកចុចលើ search bar និងវាយថា "Order Editing" ដើម្បីស្វែងរក។ នៅពេលដែលម៉ឺនុយត្រូវបានបង្ហាញ នោះពួកយើងចុចលើវា។',

  oe_title_2: "Order Editing Header",
  oe_cap_2: "Order Editing | រូបភាពទី២",
  oe_des2_txt1:
    "Order Editing Header គឺជាកន្លែងដែលមាន filters សម្រាប់ឲ្យយើងបំពេញសម្រាប់ sale order ណាមួយដែលយើងចង់ edit។",
  oe_des2_txt2:
    "ធាតុរបស់វាមានដូចជា PJP, Selling Category, Section, Outlet Name, Date From, Date To and SKU។",
  oe_des2_txt3:
    'មាន តារាង (table) បង្ហាញទិន្នន័យ (data) នៅខាងក្រោម Order Editing Header។ ធាតុរបស់វាមានដូចជា Document No, Document Date, Delivery Date, Outlet, Gross Amount, Discount, Tax, Net Amount, Received Amount, Balance Amout និង Demand Channel។ មាន "Show filter" នៅខាងក្រោម table ដែលប្រើសម្រាប់ស្វែងរក data តាម column នីមួយៗ។',
  oe_des2_txt4:
    "នៅលើ table ពួកយើងចុចទៅលើ row មួយហើយវានឹងហាយឡាយពណ៌ខៀវ។",

  oe_title_3: "Edit Order",
  oe_cap_3: "Order Editing | រូបភាពទី៣",
  oe_des3_txt1: "មាន interterface ដែលពួកយើងនឹងធ្វើ edit order។",
  oe_des3_txt2:
    'ពួកយើងត្រូវ បំពេញ (fill) ឬ​ជ្រើសរើស (select) ទៅលើធាតុនៃ "Order Editing" ដូចជា Document No, Outlet, Document Date, Delivery Date, PJP, Section និង Selling Category។',
  oe_des3_txt3: `នៅលើ table នោះពួកយើងនឹងឃើញ Product Code, Batch, Current Stock, Price Value, Demand (CS, DZ, PC), Order (CS, DZ, PC), Gross Amount និង Reason Type។ ប្រសិនបើវាមាន data នោះពួកយើងនឹងឃើញ row ដែលមាន data ជាមួយនឹង "Edit"។ ចុចទៅលើ "Edit"!`,

  oe_title_4: "Edit Order",
  oe_cap_4: "Order Editing | រូបភាពទី៤",
  oe_des4_txt1: `ពួកយើង edit ចំនួននៅក្នុង Order (CS, DZ, PC) និងជ្រើសរើសហេតុផលមួយនៅក្នុង Reason Type។ ប្រសិនបើពួកយើងចង់ save អ្វីដែលពួកយើងបាន edited ហើយយើងចុច "Save"។ ប្រសិនបើយើងមិនចង់វិញ យើងចុច "Cancel"។`,

  oe_cap_5: "Order Editing | រូបភាពទី៥",
  oe_title_5: "Validate Edit Order",
  oe_des5_txt1: 'ចុចលើប៊ូតុង "Validation" ដើម្បី complete edit order។',

  oe_cap_6: "Order Editing | រូបភាពទី៦",
  oe_title_6: "Save Edit Order",
  oe_des6_txt1: 'ចុចលើប៊ូតុង "Save" ដើ​ម្បី save និង complete edit order។',

  order_editing: "Order Editing",
  order_editing_overview: "Order Editing Overview",
  order_editing_txt: "Order Editing គឺជាកន្លែងដែលពួកយើងធ្វើការ edit ទៅលើ sale order។",

  // Fresh Sales Order (Below 24h)
  fresh_sales_return_below24h: "Fresh Sales Return (ក្រោម 24h)",
fresh_sales_return_below24h_overview: "Fresh Sales Return (Below 24h) Overview",
};

export default km;
