export const SPIRITS = [
    "Vodka",
    "Gin",
    "Rum bianco",
    "Rum scuro",
    "Rum agricolo",
    "Tequila",
    "Mezcal",
    "Whisky",
    "Bourbon",
    "Rye whiskey",
    "Scotch",
    "Cognac",
    "Brandy",
    "Aperol",
    "Campari",
    "Vermouth rosso",
    "Vermouth secco",
    "Vermouth bianco",
    "Prosecco",
    "Champagne",
    "Amaretto",
    "Cointreau",
    "Triple sec",
    "Sambuca",
    "Fernet",
    "Bitter",
    "Grand Marnier",
    "Baileys",
    "Malibu",
    "Grappa"
];

export const NON_ALCOHOLIC = [
    "Acqua tonica",
    "Soda",
    "Ginger beer",
    "Ginger ale",
    "Coca-Cola",
    "Succo d'arancia",
    "Succo di limone",
    "Succo di lime",
    "Succo di mirtillo",
    "Succo d'ananas",
    "Succo di pompelmo",
    "Succo di melograno",
    "Sciroppo di zucchero",
    "Sciroppo di zenzero",
    "Angostura",
    "Latte",
    "Panna",
    "Albume d'uovo",
    "Tè",
    "Caffè"
];

export const EXTRAS = [
    "Ghiaccio",
    "Ghiaccio tritato",
    "Spicchio di limone",
    "Spicchio di lime",
    "Scorza di limone",
    "Scorza di lime",
    "Scorza d'arancia",
    "Zucchero",
    "Zucchero di canna",
    "Sale",
    "Sale rosa",
    "Menta fresca",
    "Oliva",
    "Ciliegina",
    "Cannuccia",
    "Cetriolo",
    "Cannella",
    "Zenzero fresco",
    "Peperoncino",
    "Rosmarino",
    "Basilico"
];

export function isAlcoholic(ingredientName) {
    return SPIRITS.includes(ingredientName);
}

export function isExtra(ingredientName) {
    return EXTRAS.includes(ingredientName);
}
