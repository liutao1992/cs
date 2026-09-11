export const ECONOMY = { start: 800, kill: 300, headshot: 450, win: 3500, loss: 1400, plant: 800, defuse: 800, max: 16000 };
export function createEconomy() {
  let money = ECONOMY.start;
  return {
    get money() { return money; },
    add(n) { money = Math.min(ECONOMY.max, money + Math.max(0, Math.round(n))); return money; },
    spend(n) { if (!Number.isFinite(n) || n < 0 || money < n) return false; money -= Math.round(n); return true; },
    award(event, head = false) {
      const table = { kill: head ? ECONOMY.headshot : ECONOMY.kill, win: ECONOMY.win, loss: ECONOMY.loss, plant: ECONOMY.plant, defuse: ECONOMY.defuse };
      const amount = table[event] ?? 0;
      if (amount) this.add(amount);
      return amount;
    },
    reset() { money = ECONOMY.start; return money; }
  };
}
