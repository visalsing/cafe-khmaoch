// src/locales/ja.js
// Japanese translations.

const ja = {
  // ---- Sidebar / nav ----
  dashboard: "ダッシュボード",
  settings: "設定",
  orderBooking: "注文予約",

  // ---- Header ----
  searchAnything: "何でも検索",
  welcomeBack: "お帰りなさい",

  // ---- Settings page ----
  systemPreferences: "システム環境設定とプロフィール設定。",
  appearance: "外観",
  appearanceDescription: "このデバイスでのダッシュボードの表示方法を選択します。",
  light: "ライト",
  lightDescription: "明るい背景、暗いテキスト。",
  dark: "ダーク",
  darkDescription: "暗い背景、夜間に目に優しいデザイン。",
  system: "システム",
  systemDescription: "デバイスの外観設定に合わせます。",
  language: "言語",
  languageDescription: "ダッシュボード全体で使用する言語を選択します。",

  // ---- Stock Allocation ----
  sa_title_1: '「在庫割当」を検索',
  sa_cap_1: "在庫割当 | 画像 1",
  click_on_icon: "アイコンをクリック",
  sa_des_1:
    '次に、検索バーをクリックして「在庫割当」と入力して検索します。メニューが表示されたら、それをクリックします。',

  sa_cap_2: "在庫割当 | Image 2",
  sa_title_2: "未割当タブ",
  sa_des2_txt1: '「未割当」タブには、不足している注文が表示されます。',
  sa_des2_txt2:
    "割当済みに変更する場合（未割当から割当済みへ）、次の手順を実行します：",
  sa_des2_txt3: "行をクリックして1行を選択します（青色にハイライトされます）。",
  sa_des2_txt4: 'そして「割当」ボタンをクリックします',

  sa_cap_3: "在庫割当 | 画像 3",
  sa_title_3: "割当済みタブ",
  sa_des3_txt1: '「割当済み」タブには、十分な在庫がある注文が表示されます。',
  sa_des3_txt2:
    "未割当に変更する場合（割当済みから未割当へ）、次の手順を実行します：",
  sa_des3_txt3: "行をクリックして1行を選択します（青色にハイライトされます）。",
  sa_des3_txt4: 'そして「未割当」ボタンをクリックします',

  sa_cap_4: "在庫割当 | 画像 4",
  sa_title_4: "注文引き当ての確認",
  sa_des4_txt1: '割当済みの場合、「割当済み」タブのテーブルに表示されます。',
  sa_des4_txt2:
    '未割当の場合、「未割当」タブのテーブルに表示されます。',

  tab_allocate_text: "十分な在庫がある受注を表示します。",
  attached_photos: "添付写真",

  stock_allocation: "在庫割当",
  stock_allocation_overview: "在庫割当の概要",
  stock_allocation_txt:
    "在庫割当では、在庫の可用性（不足対十分な在庫）に基づいて受注を管理します。",
  tab_allocated: '「割当済み」タブ：',
  tab_allocated_text: "十分な在庫がある受注を表示します。",
  tab_unallocated: '「未割当」タブ：',
  tab_unallocated_text: "在庫が不足している受注を表示します。",

  editing_sale_order: "受注の編集",
  editing_sale_order_txt1: "受注を編集するには、ステータスを",
  unallocated: " 未割当 ",
  first: " に設定する必要があります。",
  editing_sale_order_txt2: "その後、受注は次の場所に表示されます：",
  option_order_editing: "受注編集オプション。",
  steps_edit_sale_order: "受注を編集する手順：",
  navigate_to: "に移動します ",
  change_the_sales_order_status: "受注ステータスを変更します：",
  unallocated_capital: "未割当",
  allocated_capital: "割当済み",
  once_completed_proceed_to: "完了したら、次へ進みます：",
  view_as_slide: "スライドとして表示",
  export_as_powerpoint: "PowerPointとしてエクスポート",
  export_as_pdf: "PDFとしてエクスポート",

  // Order Editing
  oe_title_1: '「受注編集」を検索',
  oe_cap_1: "受注編集 | 画像 1",
  oe_des_1:
    '次に、検索バーをクリックして「受注編集」と入力して検索します。メニューが表示されたら、それをクリックします。',

  oe_title_2: "受注編集ヘッダー",
  oe_cap_2: "受注編集 | 画像 2",
  oe_des2_txt1:
    "受注編集ヘッダーは、編集する受注を絞り込むためのフィルターがある場所です。",
  oe_des2_txt2:
    "要素には、PJP、販売カテゴリ、セクション、店舗名、開始日、終了日、SKUが含まれます。",
  oe_des2_txt3:
    '受注編集ヘッダーの下にはデータを示すテーブルがあります。要素には、伝票番号、伝票日付、納品日、店舗、総額、割引、税金、純額、受領金額、残高、需要チャネルがあります。テーブルの下には、各列でデータを検索するために使用される「フィルターを表示」があります。',
  oe_des2_txt4:
    "テーブル上の行をクリックすると、青色にハイライトされます。",

  oe_title_3: "注文の編集",
  oe_cap_3: "受注編集 | 画像 3",
  oe_des3_txt1: "注文を編集するインターフェースが表示されます。",
  oe_des3_txt2:
    '伝票番号、店舗、伝票日付、納品日、PJP、セクション、販売カテゴリなどの「受注編集」の要素を入力または選択する必要があります。',
  oe_des3_txt3: `テーブルには、製品コード、バッチ、現在庫、価格、需要（CS、DZ、PC）、注文（CS、DZ、PC）、総額、理由タイプが表示されます。データが存在する場合、「編集」付きの行が表示されます。「編集」をクリックしてください！`,

  oe_title_4: "注文の編集",
  oe_cap_4: "受注編集 | 画像 4",
  oe_des4_txt1: `注文（CS、DZ、PC）の数値を編集し、理由タイプから1つ選択します。編集内容を保存する場合は「保存」をクリックします。保存しない場合は「キャンセル」をクリックします。`,

  oe_cap_5: "受注編集 | 画像 5",
  oe_title_5: "注文編集の検証",
  oe_des5_txt1: '「検証」ボタンをクリックして受注編集を完了します。',

  oe_cap_6: "受注編集 | 画像 6",
  oe_title_6: "注文編集の保存",
  oe_des6_txt1: '「保存」ボタンをクリックして受注編集を保存し完了します。',

  order_editing: "受注編集",
  order_editing_overview: "受注編集の概要",
  order_editing_txt: "受注編集は、受注を編集するための場所です。",

  // Fresh Sales Order (Below 24h)
  fresh_sales_return_below24h: "生鮮売上返品（24時間以内）",
  fresh_sales_return_below24h_overview:
    "生鮮売上返品（24時間以内）の概要",
};

export default ja;