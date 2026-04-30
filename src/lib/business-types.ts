// Vocabulário adaptado por tipo de negócio
export type BusinessType =
  | "pastelaria"
  | "restauracao"
  | "artesanato"
  | "costura"
  | "cosmetica"
  | "marcenaria"
  | "outro";

export const BUSINESS_TYPES: { id: BusinessType; label: string; emoji: string; description: string }[] = [
  { id: "pastelaria", label: "Pastelaria & Bolos", emoji: "🧁", description: "Bolos, doces, sobremesas" },
  { id: "restauracao", label: "Restauração & Catering", emoji: "🍽️", description: "Refeições, catering, take-away" },
  { id: "artesanato", label: "Artesanato", emoji: "🎨", description: "Peças feitas à mão" },
  { id: "costura", label: "Costura & Moda", emoji: "🧵", description: "Roupa, acessórios, alterações" },
  { id: "cosmetica", label: "Cosmética Natural", emoji: "🧴", description: "Sabonetes, cremes, velas" },
  { id: "marcenaria", label: "Marcenaria & Madeira", emoji: "🪵", description: "Móveis, peças em madeira" },
  { id: "outro", label: "Outro pequeno negócio", emoji: "✨", description: "Personaliza ao teu gosto" },
];

export const VOCAB: Record<BusinessType, {
  product: string;
  ingredient: string;
  ingredients: string;
  machine: string;
  recipe: string;
  recipes: string;
  components: { id: string; label: string }[];
}> = {
  pastelaria: {
    product: "bolo",
    ingredient: "ingrediente",
    ingredients: "ingredientes",
    machine: "forno",
    recipe: "receita",
    recipes: "receitas",
    components: [
      { id: "massa", label: "Massa" },
      { id: "recheio", label: "Recheio" },
      { id: "cobertura", label: "Cobertura" },
      { id: "decoracao", label: "Decoração" },
    ],
  },
  restauracao: {
    product: "prato",
    ingredient: "ingrediente",
    ingredients: "ingredientes",
    machine: "fogão / forno",
    recipe: "ficha técnica",
    recipes: "fichas técnicas",
    components: [
      { id: "base", label: "Base" },
      { id: "molho", label: "Molho" },
      { id: "acompanhamento", label: "Acompanhamento" },
      { id: "decoracao", label: "Empratamento" },
    ],
  },
  artesanato: {
    product: "peça",
    ingredient: "material",
    ingredients: "materiais",
    machine: "máquina/ferramenta",
    recipe: "ficha de produto",
    recipes: "fichas de produto",
    components: [
      { id: "base", label: "Base" },
      { id: "estrutura", label: "Estrutura" },
      { id: "acabamento", label: "Acabamento" },
      { id: "decoracao", label: "Decoração" },
    ],
  },
  costura: {
    product: "peça",
    ingredient: "material",
    ingredients: "tecidos & aviamentos",
    machine: "máquina de costura",
    recipe: "ficha de produto",
    recipes: "fichas de produto",
    components: [
      { id: "tecido", label: "Tecido" },
      { id: "forro", label: "Forro" },
      { id: "aviamentos", label: "Aviamentos" },
      { id: "decoracao", label: "Detalhes" },
    ],
  },
  cosmetica: {
    product: "produto",
    ingredient: "ingrediente",
    ingredients: "ingredientes",
    machine: "equipamento",
    recipe: "fórmula",
    recipes: "fórmulas",
    components: [
      { id: "base", label: "Base" },
      { id: "ativos", label: "Ativos" },
      { id: "embalagem", label: "Embalagem" },
      { id: "decoracao", label: "Rótulo & Apresentação" },
    ],
  },
  marcenaria: {
    product: "peça",
    ingredient: "material",
    ingredients: "madeiras & ferragens",
    machine: "máquina",
    recipe: "ficha de produto",
    recipes: "fichas de produto",
    components: [
      { id: "madeira", label: "Madeira" },
      { id: "ferragens", label: "Ferragens" },
      { id: "acabamento", label: "Acabamento" },
      { id: "decoracao", label: "Decoração" },
    ],
  },
  outro: {
    product: "produto",
    ingredient: "material",
    ingredients: "materiais",
    machine: "equipamento",
    recipe: "ficha",
    recipes: "fichas",
    components: [
      { id: "base", label: "Base" },
      { id: "extra", label: "Componente extra" },
      { id: "acabamento", label: "Acabamento" },
      { id: "decoracao", label: "Decoração" },
    ],
  },
};
