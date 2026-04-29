import { Category, Product } from "./models.js";

const categories = [
  { name: "Outerwear", slug: "outerwear", image: "" },
  { name: "Essentials", slug: "essentials", image: "" }
];

const products = [
  {
    title: "SRE Hoodie",
    description: "Comfortable hoodie for late-night deploys and dashboards.",
    price: 18900,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Gray"],
    categorySlug: "outerwear"
  },
  {
    title: "Docker Compose Tee",
    description: "Lightweight cotton tee for containerized project demos.",
    price: 7900,
    sizes: ["S", "M", "L"],
    colors: ["White", "Blue"],
    categorySlug: "essentials"
  },
  {
    title: "Incident Response Cap",
    description: "Simple cap for incident response simulation screenshots.",
    price: 5900,
    sizes: ["One Size"],
    colors: ["Black"],
    categorySlug: "essentials"
  }
];

export const seedCatalog = async () => {
  const existing = await Product.countDocuments();
  if (existing > 0) return;

  const categoryBySlug = {};
  for (const category of categories) {
    categoryBySlug[category.slug] = await Category.findOneAndUpdate(
      { slug: category.slug },
      category,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await Product.insertMany(products.map((product) => ({
    title: product.title,
    description: product.description,
    price: product.price,
    sizes: product.sizes,
    colors: product.colors,
    images: [],
    category: categoryBySlug[product.categorySlug]._id,
    isActive: true
  })));
};
