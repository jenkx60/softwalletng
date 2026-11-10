export type ConditionKind = "new" | "uk_used";

export type StockLevel = "in" | "low" | "out";

export type Category = {
  slug: string;
  name: string;
};

export type ProductSpec = {
  label: string;
  value: string;
};

export type Review = {
  author: string;
  rating: number;
  body: string;
  verified: boolean;
};

export type ProductVariant = {
  id: string;
  storage: string | null;
  color: string | null;
  priceKobo: number;
  compareAtKobo: number | null;
  isSerialized: boolean;
};

export type ProductDetail = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  categorySlug: string;
  condition: ConditionKind;
  conditionGrade: string | null;
  batteryHealth: number | null;
  imeiVerified: boolean;
  priceKobo: number;
  compareAtKobo: number | null;
  stock: StockLevel;
  stockLabel: string;
  storages: string[];
  colors: string[];
  selectedStorage: string;
  selectedColor: string;
  specs: ProductSpec[];
  reviews: Review[];
  reviewAverage: number;
  reviewCount: number;
};

export type ProductCardModel = {
  slug: string;
  name: string;
  priceKobo: number;
  condition: ConditionKind | "out";
  stock: StockLevel;
  stockLabel: string;
};

export type TickerItem = {
  kind: "new" | "sale" | "soon";
  text: string;
  wasKobo?: number;
  priceKobo?: number;
};
