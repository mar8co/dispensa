// Piani dell'abbonamento Premium: UNICO posto dove vivono prezzi e id
// prodotto. Gli `id` devono combaciare con quelli configurati in App Store
// Connect (StoreKit li userà per l'acquisto).
//
// Sul prezzo barrato: NON è un prezzo di riferimento inventato, è il costo
// reale di 12 mensilità (1,99 × 12 = 23,88 €), cioè quanto si risparmia
// davvero scegliendo l'annuale. Un "prima costava X" mai applicato
// violerebbe la direttiva Omnibus (UE 2019/2161) e rischia il rifiuto in
// review. Quando su App Store Connect ci sarà un'offerta introduttiva VERA
// (es. annuale a 23,99 € scontato a 14,99 €), basterà cambiare qui.
export const PLANS = {
  monthly: {
    id: "dispensa.premium.monthly",
    label: "Mensile",
    price: "1,99 €",
    note: "al mese",
  },
  yearly: {
    id: "dispensa.premium.yearly",
    label: "Annuale",
    price: "14,99 €",
    note: "1,25 € al mese",
    was: "23,88 €",
    wasNote: "pagando ogni mese",
    savePct: 37,
  },
};

export const TRIAL_DAYS = 7;
