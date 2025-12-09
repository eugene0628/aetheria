const TILE_SIZE = 32;
const MAP_SIZE = 120;
const SAVE_KEY = 'aetheria_v5_enhanced';

const ITEMS = {
    berry: { name: 'Spirit Berry', type: 'food', val: 15, desc: "A common fruit infused with trace Qi. Restores Stamina and Hunger.", color: '#e74c3c' },
    meat: { name: 'Raw Beast Meat', type: 'food', val: 10, desc: "Raw meat from a spirit beast. Edible, but better cooked.", color: '#ff7675' },
    cooked_meat: { name: 'Roast Spirit Meat', type: 'food', val: 50, desc: "Succulent roast meat. Greatly reduces hunger.", color: '#d63031' },
    wood: { name: 'Ironwood', type: 'mat', desc: "Wood as hard as iron. Used for crafting weapons.", color: '#e67e22' },
    stone: { name: 'Spirit Stone', type: 'mat', desc: "A stone radiating faint energy.", color: '#74b9ff' },
    spirit_jade: { name: 'Spirit Jade', type: 'mat', desc: "Refined jade containing pure Qi.", color: '#00cec9' },
    core: { name: 'Beast Core', type: 'rare', desc: "The crystallized essence of a powerful monster.", color: '#f1c40f' },
    bandage: { name: 'Herbal Bandage', type: 'heal', val: 40, desc: "Herbs wrapped in cloth. Heals HP.", color: '#fff' },
    pill_minor: { name: 'Qi Pill', type: 'cult', val: 30, desc: "A pill that instantly restores Qi.", color: '#fdcb6e' },
    pill_major: { name: 'Golden Soul Pill', type: 'cult', val: 100, desc: "A legendary pill. Massive Qi boost.", color: '#e1b12c' },
    sword_basic: { name: 'Spirit Sword', type: 'equip', slot: 'wep', stats: {str: 8, wis: 2}, desc: "A sword forged from Ironwood and Jade. (+8 STR, +2 WIS)", color: '#a29bfe' },
    robe_basic: { name: 'Daoist Robe', type: 'equip', slot: 'arm', stats: {def: 8, spd: 2}, desc: "A robe inscribed with protective runes. (+8 DEF, +2 SPD)", color: '#74b9ff' }
};

const RECIPES = [
    { id: 'bandage', name: "Bandage", cost: { berry: 2 } },
    { id: 'cooked_meat', name: "Roast Meat", cost: { meat: 1, wood: 1 } },
    { id: 'sword_basic', name: "Spirit Sword", cost: { wood: 10, stone: 5, spirit_jade: 2 } },
    { id: 'robe_basic', name: "Daoist Robe", cost: { meat: 5, berry: 5, spirit_jade: 2 } },
    { id: 'pill_minor', name: "Qi Pill", cost: { spirit_jade: 1, berry: 3 } },
    { id: 'pill_major', name: "Golden Soul Pill", cost: { spirit_jade: 5, core: 1 } }
];

const REALMS = [
    { name: "MORTAL", req: 0 },
    { name: "BODY TEMPERING", req: 80 },
    { name: "QI CONDENSATION", req: 200 },
    { name: "FOUNDATION EST.", req: 500 },
    { name: "GOLDEN CORE", req: 1200 }
];

const SKILLS = [
    { id: 1, name: "Qi Blast", cost: 5, cd: 0.8, range: 250, dmgMult: 1.5, type: 'proj' },
    { id: 2, name: "Cloud Step", cost: 10, cd: 2.5, type: 'dash' },
    { id: 3, name: "Star Nova", cost: 35, cd: 6.0, range: 120, dmgMult: 4.0, type: 'aoe' }
];
