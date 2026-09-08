export const STREAK_WINDOW=4;
export function streakLevel(n){return n>=5?4:n>=4?3:n>=3?2:n>=2?1:0;}
export function streakLabel(level){return['','双杀','三杀','四杀','疯狂杀戮'][level]||'';}
export function streakSub(level){return['','DOUBLE KILL','TRIPLE KILL','QUAD KILL','KILLING SPREE'][level]||'';}
export function computeScore(head,streakActive){const base=100+(head?50:0);return streakActive?base*2:base;}
export function createStreak(){return{count:0,until:0,level:0,max:0};}
export function registerKill(st,now){st.count=now<=st.until?st.count+1:1;st.until=now+STREAK_WINDOW;st.level=streakLevel(st.count);st.max=Math.max(st.max,st.count);return st.level;}
export function tickStreak(st,now){if(st.count&&now>st.until){st.count=0;st.level=0;}return st.count>1;}
