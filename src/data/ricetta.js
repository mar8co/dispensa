// Forma compatta delle ricette del ricettario di base (vedi ricetteBase.js):
//   R(titolo, tempo, "Nome:dose|Nome:dose", ["passaggio@minuti"])
// → { title, time, servings: 2, ingredients:[{name, qty}], steps:[{text, timer}] }
// Dosi sempre per 2 porzioni. "@minuti" in fondo a un passaggio = timer.
export function R(title, time, ingredients, steps) {
  return {
    title, time, servings: 2,
    ingredients: ingredients.split("|").map((s) => {
      const i = s.lastIndexOf(":");
      return { name: s.slice(0, i), qty: s.slice(i + 1) };
    }),
    steps: steps.map((s) => {
      const [text, timer] = s.split("@");
      return { text, timer: timer ? Number(timer) : null };
    }),
  };
}

// Olio e sale: presenti quasi ovunque, sempre "q.b." (non contano tra i mancanti).
export const QB = "Olio EVO:q.b.|Sale:q.b.";
