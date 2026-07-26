// ─── Symbole der Ausgabenseite ────────────────────────────────────────────────
// lib/expenseCategories.js bleibt frei von React und lucide, damit es unter
// `node --test` läuft. Die Zuordnung Kategorie → Symbol gehört in die Ansicht,
// und das ist hier.
//
// Unterschieden wird über das Symbol, nicht über die Farbe — wie auf der
// Vertragsseite. Farbe bleibt dem Status vorbehalten.

import {
  ShoppingCart, UtensilsCrossed, Home, Sprout, Shirt, HeartPulse, Car, Plane,
  Gamepad2, Gift, Laptop, PawPrint, BookOpen, Receipt, Package,
  Banknote, TrendingUp, RotateCcw, Tag, Wallet,
  Landmark, CreditCard, Globe, Coins,
} from 'lucide-react';

// Nachgeschlagen wird, nicht aufgerufen: ein Symbol, das aus einem Funktions-
// aufruf im Render fällt, sieht React als jedes Mal neue Komponente — sie würde
// samt Zustand neu eingehängt. Deshalb Zuordnungstabellen und ein Zugriff.
export const CATEGORY_ICONS = {
  groceries: ShoppingCart,
  dining:    UtensilsCrossed,
  household: Home,
  garden:    Sprout,
  clothing:  Shirt,
  health:    HeartPulse,
  transport: Car,
  travel:    Plane,
  leisure:   Gamepad2,
  gifts:     Gift,
  tech:      Laptop,
  pets:      PawPrint,
  education: BookOpen,
  fees:      Receipt,
  other:     Package,

  income_salary: Banknote,
  income_bonus:  TrendingUp,
  income_refund: RotateCcw,
  income_sale:   Tag,
  income_gift:   Gift,
  income_other:  Wallet,
};

export const ACCOUNT_ICONS = {
  cash:   Coins,
  bank:   Landmark,
  card:   CreditCard,
  online: Globe,
};
