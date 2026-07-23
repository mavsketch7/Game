// Auto-generated during the modularization refactor (2026-07-23).
import { MAX_NIV_PJ } from "../core/constants.js";
import { habilidad } from "./abilities.js";
import { M } from "./input.js";
import { clamp } from "../utils/helpers.js";

export const CARD_RAREZAS = [
        { id: "normal", nombre: "Normal", cls: "rar-normal", peso: 45 },
        { id: "magico", nombre: "Mágico", cls: "rar-magico", peso: 28 },
        { id: "raro", nombre: "Raro", cls: "rar-raro", peso: 16 },
        { id: "epico", nombre: "Épico", cls: "rar-epico", peso: 8 },
        {
          id: "legendario",
          nombre: "Legendario",
          cls: "rar-legendario",
          peso: 3,
        },
      ];

function poolCartas(rol) {
        // 5 rarezas × varias cartas por rareza, mezcla genérica + específicas de clase
        const comunes = [
          {
            rar: "normal",
            ico: "❤️",
            nombre: "Vitalidad",
            desc: "Incremento de vida máxima.",
            val: "+35 HP",
            fn: (p) => {
              p._bonusHP = (p._bonusHP || 0) + 35;
            },
          },
          {
            rar: "normal",
            ico: "⚡",
            nombre: "Adrenalina",
            desc: "Pequeño aumento de daño base.",
            val: "+3 daño",
            fn: (p) => {
              p._bonusAtk = (p._bonusAtk || 0) + 3;
            },
          },
          {
            rar: "normal",
            ico: "🛡️",
            nombre: "Piel Dura",
            desc: "Incremento de armadura.",
            val: "+3 arm.",
            fn: (p) => {
              p._bonusArmor = (p._bonusArmor || 0) + 3;
            },
          },
          {
            rar: "normal",
            ico: "💨",
            nombre: "Paso Ligero",
            desc: "Pequeño aumento de velocidad de movimiento.",
            val: "+8 vel.",
            fn: (p) => {
              p._bonusVel = (p._bonusVel || 0) + 8;
            },
          },
          {
            rar: "magico",
            ico: "❤️",
            nombre: "Corazón Fuerte",
            desc: "Gran aumento de vida máxima.",
            val: "+70 HP",
            fn: (p) => {
              p._bonusHP = (p._bonusHP || 0) + 70;
            },
          },
          {
            rar: "magico",
            ico: "⚡",
            nombre: "Furia",
            desc: "Mejora notable de daño.",
            val: "+7 daño",
            fn: (p) => {
              p._bonusAtk = (p._bonusAtk || 0) + 7;
            },
          },
          {
            rar: "magico",
            ico: "⚔️",
            nombre: "Ojo Crítico",
            desc: "Probabilidad de crítico aumentada.",
            val: "+8% crítico",
            fn: (p) => {
              p._bonusCrit = (p._bonusCrit || 0) + 8;
            },
          },
          {
            rar: "magico",
            ico: "💎",
            nombre: "Escama Arcana",
            desc: "Mejora de armadura y algo de daño.",
            val: "+4 arm/+2 atk",
            fn: (p) => {
              p._bonusArmor = (p._bonusArmor || 0) + 4;
              p._bonusAtk = (p._bonusAtk || 0) + 2;
            },
          },
          {
            rar: "raro",
            ico: "🌀",
            nombre: "Ímpetu Constante",
            desc: "+12% velocidad de ataque permanente.",
            val: "+12% vel.atk",
            fn: (p) => {
              p._hasteBonus = (p._hasteBonus || 0) + 0.12;
            },
          },
          {
            rar: "raro",
            ico: "❤️",
            nombre: "Reserva Vital",
            desc: "Gran aumento de vida máxima.",
            val: "+120 HP",
            fn: (p) => {
              p._bonusHP = (p._bonusHP || 0) + 120;
            },
          },
          {
            rar: "raro",
            ico: "⚡",
            nombre: "Poder Bruto",
            desc: "Alto aumento de daño base.",
            val: "+14 daño",
            fn: (p) => {
              p._bonusAtk = (p._bonusAtk || 0) + 14;
            },
          },
          {
            rar: "raro",
            ico: "🔄",
            nombre: "Reducción de Enfriamiento",
            desc: "Reduce los cooldowns un 10%.",
            val: "-10% CD",
            fn: (p) => {
              p._bonusCdr = (p._bonusCdr || 0) + 10;
            },
          },
          {
            rar: "epico",
            ico: "⚡",
            nombre: "Heraldo del Daño",
            desc: "Muy alto aumento de daño.",
            val: "+22 daño",
            fn: (p) => {
              p._bonusAtk = (p._bonusAtk || 0) + 22;
            },
          },
          {
            rar: "epico",
            ico: "❤️",
            nombre: "Titán",
            desc: "Vida máxima muy aumentada.",
            val: "+200 HP",
            fn: (p) => {
              p._bonusHP = (p._bonusHP || 0) + 200;
            },
          },
          {
            rar: "epico",
            ico: "⚔️",
            nombre: "Maestro del Crítico",
            desc: "Gran bonificación de crítico.",
            val: "+18% crítico",
            fn: (p) => {
              p._bonusCrit = (p._bonusCrit || 0) + 18;
            },
          },
          {
            rar: "epico",
            ico: "🛡️",
            nombre: "Muralla",
            desc: "Alta armadura y algo de HP.",
            val: "+12 arm/+80 HP",
            fn: (p) => {
              p._bonusArmor = (p._bonusArmor || 0) + 12;
              p._bonusHP = (p._bonusHP || 0) + 80;
            },
          },
          {
            rar: "legendario",
            ico: "⚡",
            nombre: "Furia del Véspero",
            desc: "Enorme aumento de daño. Para los valientes.",
            val: "+38 daño",
            fn: (p) => {
              p._bonusAtk = (p._bonusAtk || 0) + 38;
            },
          },
          {
            rar: "legendario",
            ico: "❤️",
            nombre: "Inmortalidad",
            desc: "Vida máxima masiva.",
            val: "+350 HP",
            fn: (p) => {
              p._bonusHP = (p._bonusHP || 0) + 350;
            },
          },
          {
            rar: "legendario",
            ico: "🌀",
            nombre: "Doble Ejecución",
            desc: "La habilidad especial se lanza dos veces.",
            val: "×2 Ulti",
            fn: (p) => {
              p._doubleUlti = true;
            },
          },
          {
            rar: "legendario",
            ico: "🔮",
            nombre: "Trascendencia",
            desc: "Crítico +30%, daño +20, HP +150.",
            val: "+30% crit/+20atk/+150HP",
            fn: (p) => {
              p._bonusCrit = (p._bonusCrit || 0) + 30;
              p._bonusAtk = (p._bonusAtk || 0) + 20;
              p._bonusHP = (p._bonusHP || 0) + 150;
            },
          },
        ];
        // específicas de clase
        const espec = {
          guerrero: [
            {
              rar: "raro",
              ico: "⚔️",
              nombre: "Acero Templado",
              desc: "Cada parry exitoso regenera 8% de vida.",
              val: "Parry = +8% HP",
              fn: (p) => {
                p._parryHeal = (p._parryHeal || 0) + 0.08;
              },
            },
            {
              rar: "epico",
              ico: "🌀",
              nombre: "Torbellino Eterno",
              desc: "Reduce el CD del Torbellino a la mitad.",
              val: "-50% CD Ulti",
              fn: (p) => {
                p._ultCdMult = (p._ultCdMult || 1) * 0.5;
              },
            },
          ],
          arquero: [
            {
              rar: "raro",
              ico: "🎯",
              nombre: "Flecha Perforante",
              desc: "Las flechas atraviesan un enemigo adicional.",
              val: "Flechas +1 penet.",
              fn: (p) => {
                p._pierceProy = (p._pierceProy || 0) + 1;
              },
            },
            {
              rar: "epico",
              ico: "⚡",
              nombre: "Cadencia Mortal",
              desc: "Velocidad de ataque con arco +25%.",
              val: "+25% vel. arco",
              fn: (p) => {
                p._hasteBonus = (p._hasteBonus || 0) + 0.25;
              },
            },
          ],
          mago: [
            {
              rar: "raro",
              ico: "🔥",
              nombre: "Resonancia",
              desc: "Tus ultis elementales (áreas) duran un 40% más.",
              val: "+40% duración",
              fn: (p) => {
                p._areaDurMult = (p._areaDurMult || 1) * 1.4;
              },
            },
            {
              rar: "epico",
              ico: "🌊",
              nombre: "Desbordamiento",
              desc: "Tus ultis elementales son un 30% más grandes.",
              val: "+30% radio",
              fn: (p) => {
                p._areaRadMult = (p._areaRadMult || 1) * 1.3;
              },
            },
          ],
          clerigo: [
            {
              rar: "raro",
              ico: "✨",
              nombre: "Gracia Divina",
              desc: "Las curas son un 25% más potentes.",
              val: "+25% curas",
              fn: (p) => {
                p._healBonus = (p._healBonus || 1) * 1.25;
              },
            },
            {
              rar: "epico",
              ico: "🌟",
              nombre: "Escudo Eterno",
              desc: "La Égida otorga un 25% más de escudo.",
              val: "+25% Égida",
              fn: (p) => {
                p._egidaBonus = (p._egidaBonus || 1) * 1.25;
              },
            },
          ],
          picaro: [
            {
              rar: "raro",
              ico: "☠️",
              nombre: "Hoja Envenenada",
              desc: "Tus dagas aplican veneno (daño en el tiempo).",
              val: "Veneno 3s",
              fn: (p) => {
                p._poison = true;
              },
            },
            {
              rar: "epico",
              ico: "🌑",
              nombre: "Sombra Letal",
              desc: "Tu esquive daña a los enemigos que atraviesas.",
              val: "Dash daña",
              fn: (p) => {
                p._dashDmg = true;
              },
            },
          ],
          druida: [
            {
              rar: "raro",
              ico: "🌿",
              nombre: "Vínculo Salvaje",
              desc: "Transformarte te cura un 10% de la vida máxima.",
              val: "Cambio = +10% HP",
              fn: (p) => {
                p._formHeal = (p._formHeal || 0) + 0.1;
              },
            },
            {
              rar: "epico",
              ico: "🐾",
              nombre: "Alfa de la Manada",
              desc: "Tus formas animales infligen un 20% más de daño.",
              val: "+20% formas",
              fn: (p) => {
                p._formDmg = (p._formDmg || 1) * 1.2;
              },
            },
          ],
        };
        return [...comunes, ...(espec[rol] || [])];
      }

export function sortearCartas(p) {
        const pool = poolCartas(p.rol);
        // peso ponderado: rarezas más altas si nivel alto
        const nivMult = clamp(p.nivel / MAX_NIV_PJ, 0, 1);
        const pesos = CARD_RAREZAS.map((r) => {
          const mod =
            r.id === "normal"
              ? 1 - nivMult * 0.6
              : r.id === "magico"
                ? 1 + nivMult * 0.2
                : r.id === "raro"
                  ? 1 + nivMult * 0.5
                  : r.id === "epico"
                    ? 1 + nivMult * 0.9
                    : 1 + nivMult * 1.4;
          return Math.max(0.5, r.peso * mod);
        });
        function elegirRareza() {
          const t = pesos.reduce((a, b) => a + b, 0);
          let r2 = Math.random() * t;
          for (let i = 0; i < pesos.length; i++) {
            r2 -= pesos[i];
            if (r2 <= 0) return CARD_RAREZAS[i].id;
          }
          return CARD_RAREZAS[0].id;
        }
        const elegidas = [];
        const usados = new Set();
        while (elegidas.length < 3 && elegidas.length < pool.length) {
          const rar = elegirRareza();
          const candidatos = pool.filter(
            (c, i) => c.rar === rar && !usados.has(i),
          );
          if (!candidatos.length) continue;
          const c = candidatos[Math.floor(Math.random() * candidatos.length)];
          const idx = pool.indexOf(c);
          if (!usados.has(idx)) {
            usados.add(idx);
            elegidas.push({ ...c, poolIdx: idx });
          }
        }
        return elegidas;
      }
