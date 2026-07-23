// Auto-generated during the modularization refactor (2026-07-23).

export const COLORES_J = ["#e9b45c", "#7fd4c1", "#c084f0", "#e06070"];

export const ROLES = {
        guerrero: {
          nombre: "Guerrero",
          desc: "Espada en arco, parry y aguante.",
          hp: 150,
          res: 100,
          resNombre: "Aguante",
          atk: 16,
          armor: 8,
          crit: 6,
          vel: 150,
          skill: {
            nombre: "Torbellino",
            desc: "Giro 360° a tu alrededor",
            cd: 5,
            coste: 30,
          },
        },
        arquero: {
          nombre: "Arquero",
          desc: "Flechas rápidas a distancia.",
          hp: 90,
          res: 100,
          resNombre: "Energía",
          atk: 12,
          armor: 2,
          crit: 22,
          vel: 172,
          skill: {
            nombre: "Multidisparo",
            desc: "Abanico de 5 flechas",
            cd: 5,
            coste: 30,
          },
        },
        mago: {
          nombre: "Mago",
          desc: "Proyectiles elementales: quema, congela o carga el orbe arcano.",
          hp: 75,
          res: 130,
          resNombre: "Maná",
          atk: 13,
          armor: 1,
          crit: 12,
          vel: 152,
          skill: {
            nombre: "Cataclismo",
            desc: "Ulti según elemento: zona ígnea, escarcha o portal arcano",
            cd: 6,
            coste: 45,
          },
        },
        clerigo: {
          nombre: "Clérigo",
          desc: "Soporte: cura, acelera y escuda al grupo.",
          hp: 115,
          res: 120,
          resNombre: "Maná",
          atk: 8,
          armor: 5,
          crit: 8,
          vel: 156,
          skill: {
            nombre: "Consagración",
            desc: "Gran área sagrada: daña enemigos y cura aliados",
            cd: 6,
            coste: 40,
          },
        },
        picaro: {
          nombre: "Pícaro",
          desc: "Dagas veloces, crítico brutal y movilidad extrema.",
          hp: 95,
          res: 100,
          resNombre: "Energía",
          atk: 13,
          armor: 3,
          crit: 28,
          vel: 178,
          skill: {
            nombre: "Danza de Cuchillas",
            desc: "Atraviesa a los enemigos en línea recta",
            cd: 5,
            coste: 30,
          },
        },
        druida: {
          nombre: "Druida",
          desc: "Lanza ramas y se transforma en águila, lobo u oso.",
          hp: 110,
          res: 110,
          resNombre: "Naturaleza",
          atk: 10,
          armor: 4,
          crit: 12,
          vel: 160,
          skill: {
            nombre: "Ira Salvaje",
            desc: "Zarzas en el suelo: daño continuo y ralentización",
            cd: 6,
            coste: 40,
          },
        },
      };

export const ORDEN_ROLES = [
        "guerrero",
        "arquero",
        "mago",
        "clerigo",
        "picaro",
        "druida",
      ];

export const FORMAS_DRUIDA = ["aguila", "lobo", "oso"];

export const FORMAS_INFO = {
        humano: { nombre: "Humano", ico: "🌿", color: "#6ac04a" },
        aguila: { nombre: "Águila", ico: "🦅", color: "#d8c090" },
        lobo: { nombre: "Lobo", ico: "🐺", color: "#8a93a3" },
        oso: { nombre: "Oso", ico: "🐻", color: "#8a5a30" },
      };

export const LOBBIES = {
        buenos: {
          nombre: "Buenos",
          icon: "✦",
          desc: "Todo el grupo: escudo del 12% de HP por planta y curas +20%.",
        },
        malos: {
          nombre: "Malos",
          icon: "⸸",
          desc: "Todo el grupo: robo de vida del 12% del daño infligido.",
        },
      };

export const ELEMENTOS = {
        fuego: {
          nombre: "Fuego",
          color: "#ff7d4d",
          dps: 26,
          slow: 0,
          healPS: 0,
          ttl: 2.2,
        },
        hielo: {
          nombre: "Hielo",
          color: "#7fc9e8",
          dps: 12,
          slow: 0.55,
          healPS: 0,
          ttl: 2.6,
        },
        arcano: {
          nombre: "Arcano",
          color: "#c07be0",
          dps: 22,
          slow: 0,
          healPS: 0,
          ttl: 1.9,
        },
        sagrado: {
          nombre: "Sagrado",
          color: "#ffe6a3",
          dps: 16,
          slow: 0,
          healPS: 12,
          ttl: 2.4,
        },
        zarzas: {
          nombre: "Zarzas",
          color: "#6ac04a",
          dps: 18,
          slow: 0.5,
          healPS: 0,
          ttl: 3,
        },
      };

export const ELEM_MAGO = ["fuego", "hielo", "arcano"];

export const SUPS = [
        {
          nombre: "Área de sanación",
          corto: "Sanar",
          coste: 30,
          cd: 5,
          color: "#7fd4c1",
        },
        {
          nombre: "Ímpetu (vel. de ataque)",
          corto: "Ímpetu",
          coste: 25,
          cd: 8,
          color: "#e9b45c",
        },
        {
          nombre: "Égida (escudo)",
          corto: "Égida",
          coste: 30,
          cd: 9,
          color: "#8fb8e8",
        },
      ];

export const SLOTS = ["arma", "armadura", "accesorio"];

export const RAREZAS = [
        { n: "Común", cls: "r0", col: "#b9b2c6", m: 1 },
        { n: "Raro", cls: "r1", col: "#6fb3e8", m: 1.5 },
        { n: "Épico", cls: "r2", col: "#c084f0", m: 2.2 },
        { n: "Legendario", cls: "r3", col: "#e9b45c", m: 3.2 },
      ];

export const PRECIO_VENTA = [8, 20, 50, 120];

export const NOMBRES_ARMA_CLASE = {
        guerrero: ["Espada", "Filo", "Hacha", "Mandoble"],
        arquero: ["Arco", "Ballesta", "Arco Largo"],
        mago: ["Cetro", "Vara", "Orbe"],
        clerigo: ["Báculo", "Cáliz", "Reliquia"],
        picaro: ["Daga", "Estilete", "Garra"],
        druida: ["Bastón", "Tótem", "Garrote"],
      };

export const NOMBRES_ITEM = {
        armadura: ["Coraza", "Manto", "Cota", "Piel", "Égida", "Sudario"],
        accesorio: [
          "Anillo",
          "Talismán",
          "Sello",
          "Vial",
          "Reliquia",
          "Amuleto",
        ],
      };

export const SUFIJOS = [
        "del Anochecer",
        "de la Planta Rota",
        "del Lucero",
        "de Ceniza",
        "del Juramento",
        "de Véspero",
        "del Peregrino",
        "de Sangre Fría",
      ];

export const ETQ = {
        atk: "Daño",
        hp: "Vida",
        armor: "Armadura",
        crit: "Crítico %",
        vel: "Velocidad",
        cdr: "Red. CD %",
      };

const CLIMAS = ["despejado", "lluvia", "niebla", "tormenta", "ceniza"];

export const NOMBRE_CLIMA = {
        despejado: "",
        lluvia: "🌧 Lluvia",
        niebla: "🌫 Niebla",
        tormenta: "⛈ Tormenta",
        ceniza: "🌋 Ceniza",
      };

export const MAX_PLANTA = 100;

export const MAX_NIV_PJ = 50;

export const XP_POR_PLANTA = 100;

export const XP_TABLA = Array.from({ length: MAX_NIV_PJ + 1 }, (_, i) =>
        Math.round(400 + i * 180 + i * i * 8),
      );
