// Sprungziele in den Raid Guide: Begegnungsname → Anker im Guide (guide/index.html#id).
const ENC = {
  'Root of Nightmares': { Cataclysm: 'cataclysm', Scission: 'scission', Macrocosm: 'macrocosm', Nezarec: 'nezarec' },
  "King's Fall": { Totems: 'kftotems', Warpriest: 'warpriest', Golgoroth: 'golgoroth', 'Daughters of Oryx': 'daughters', Daughters: 'daughters', Oryx: 'oryx' },
  'Last Wish': { Kalli: 'kalli', 'Shuro Chi': 'shurochi', Morgeth: 'morgeth', Vault: 'vault', Riven: 'riven', Queenswalk: 'queenswalk' },
  'Vault of Glass': { Confluxes: 'vgconf', Oracles: 'vgoracle', Templar: 'vgtemplar', Gatekeeper: 'vggate', Gatekeepers: 'vggate', Atheon: 'vgatheon' },
  "Salvation's Edge": { Substratum: 'substratum', Dissipation: 'dissipation', Repository: 'repository', Verity: 'verity', 'The Witness': 'zenith' },
  Equilibrium: { Harvester: 'eqharv', Harrow: 'eqharrow', Sere: 'eqsere' },
};
const START = { 'Root of Nightmares': 'cataclysm', "King's Fall": 'kfopen', 'Last Wish': 'kalli', 'Vault of Glass': 'vgopen', "Salvation's Edge": 'substratum', Equilibrium: 'eqharv',
  'Deep Stone Crypt': 'dscsec', 'Garden of Salvation': 'gsevade', 'Vow of the Disciple': 'vwacq', "Crota's End": 'ceabyss', 'The Desert Perpetual': 'dpepo',
  'The Shattered Throne': 'stvorg', 'Pit of Heresy': 'phnecro', Prophecy: 'prphal', 'Grasp of Avarice': 'gaphry', Duality: 'dugahl', 'Spire of the Watcher': 'spaak',
  'Ghosts of the Deep': 'gdecth', "Warlord's Ruin": 'wrrath', "Vesper's Host": 'vhact', 'Sundered Doctrine': 'sdzoe' };
const norm = (s) => String(s || '').replace(/[’']/g, "'").toLowerCase();
// Liefert die Guide-ID für eine Begegnung (egal aus welchem Raid) oder für einen ganzen Raid.
export function guideId(encOderRaid, raid) {
  for (const [r, m] of Object.entries(ENC)) {
    if (raid && norm(raid) !== norm(r)) continue;
    for (const [n, id] of Object.entries(m)) if (norm(encOderRaid).startsWith(norm(n))) return id;
    if (norm(encOderRaid) === norm(r)) return START[r];
  }
  if (!raid) for (const [r, id] of Object.entries(START)) if (norm(encOderRaid) === norm(r)) return id;
  return null;
}
export const IM_GUIDE = Object.keys(START);
