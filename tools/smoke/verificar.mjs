// npm run smoke -- arnés de verificación visual del personaje (idle/
// correr/ataque, las 4 clases activas, varias direcciones de puntería).
//
// No es un test automatizado de verdad (no hay aserciones, un humano
// tiene que mirar las capturas) -- es el primer paso hacia eso: antes
// de este script, verificar un cambio de sprite/arma significaba montar
// esto a mano cada vez en un scratchpad. Ahora es un comando.
//
// Arranca su propio servidor de Vite (no hace falta tener `npm run dev`
// corriendo antes), recorre las 4 clases, y guarda las capturas en
// tools/smoke/output/ (no versionado, se regenera cada vez).
import { spawn } from "node:child_process";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const RAIZ = path.resolve(fileURLToPath(import.meta.url), "../../..");
const SALIDA = path.join(RAIZ, "tools/smoke/output");

// Sin .env.local el cliente de Supabase revienta al cargar la página
// (ver src/net/supabaseClient.js) y el juego no llega ni al menú --
// mismo problema que se pisó la primera vez que se montó este arnés a
// mano. Con placeholders de .env.local.example alcanza para este smoke
// test (no toca nada que hable de verdad con Supabase).
function asegurarEnvLocal() {
  const envLocal = path.join(RAIZ, ".env.local");
  const ejemplo = path.join(RAIZ, ".env.local.example");
  if (!existsSync(envLocal) && existsSync(ejemplo)) {
    copyFileSync(ejemplo, envLocal);
    console.log("[smoke] .env.local no existía -- copiado desde .env.local.example");
  }
}

// eslint-disable-next-line no-control-regex
const RE_ANSI = /\x1b\[[0-9;]*m/g;

function arrancarVite() {
  return new Promise((resolve, reject) => {
    // Se invoca el binario de Vite directamente con `node` (en vez de
    // `npx vite` con shell:true) para que el PID que da spawn() sea el
    // proceso de verdad, no un cmd.exe/npx envolviéndolo -- con el
    // envoltorio, proc.kill() solo mataba la cáscara y Vite se quedaba
    // corriendo de fondo, huérfano, y `npm run smoke` no llegaba a
    // salir nunca (bug real, visto la primera vez que se probó esto).
    const binVite = path.join(RAIZ, "node_modules/vite/bin/vite.js");
    const proc = spawn(process.execPath, [binVite, "--strictPort", "--port", "5199"], {
      cwd: RAIZ,
    });
    let salida = "";
    // Si esto falla (timeout o Vite sale con error) hay que matar el
    // proceso igualmente -- ya está arrancado (spawn ya lo lanzó), y si
    // no se mata aquí se queda huérfano corriendo de fondo y el propio
    // `npm run smoke` no llega a salir nunca (sus pipes de stdout siguen
    // abiertos). Bug real que se dio la primera vez que se probó este
    // script -- ver commit.
    const limpiarYRechazar = (err) => {
      clearTimeout(timeout);
      proc.kill();
      reject(err);
    };
    const timeout = setTimeout(() => {
      limpiarYRechazar(new Error("Vite no arrancó a tiempo. Salida:\n" + salida));
    }, 20000);
    proc.stdout.on("data", (d) => {
      salida += d.toString();
      // Vite colorea su salida (códigos ANSI) -- "Local:" y la URL casi
      // siempre tienen algún código de color/reset entre medias, así que
      // buscar el texto exacto sin limpiarlo antes NUNCA hacía match (bug
      // real: dejaba el timeout de 20s como único camino de salida, y
      // ese camino tampoco mataba el proceso -- ver limpiarYRechazar).
      if (/Local:\s*http/.test(salida.replace(RE_ANSI, ""))) {
        clearTimeout(timeout);
        resolve(proc);
      }
    });
    proc.stderr.on("data", (d) => (salida += d.toString()));
    proc.on("exit", (code) => {
      if (code !== null && code !== 0) limpiarYRechazar(new Error("Vite salió con código " + code + ":\n" + salida));
    });
  });
}

const URL_BASE = "http://localhost:5199";

const CLASES = [
  { nombre: "guerrero", clicksCarrusel: 0 },
  { nombre: "arquero", clicksCarrusel: 1 },
  { nombre: "mago", clicksCarrusel: 2 },
  { nombre: "picaro", clicksCarrusel: 3 },
];

const DIRECCIONES = {
  derecha: { x: 900, y: 400 },
  izquierda: { x: 380, y: 400 },
  abajo: { x: 640, y: 650 },
  arriba: { x: 640, y: 150 },
};

async function entrarEnPartida(page, clicksCarrusel) {
  await page.goto(URL_BASE, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.mouse.click(640, 400); // cierra "Pulsa Start"
  await page.waitForTimeout(600);
  for (let i = 0; i < clicksCarrusel; i++) {
    await page.click(".flecha-der");
    await page.waitForTimeout(120);
  }
  // "Lobby del grupo" (bando Buenos/Malos) vive en el popover de la
  // hoguera desde el rediseño de la ficha de personaje como libro
  // (2026-08-26) -- ver ui/menu.js: construirPopoverFogata().
  await page.click("#icono-fogata");
  await page.waitForTimeout(200);
  await page.click('#popover-fogata-ajustes button:has-text("Buenos")');
  await page.waitForTimeout(200);
  await page.click("#popover-fogata .popover-cerrar");
  await page.waitForTimeout(200);
  await page.click("text=Marcar listo");
  await page.waitForTimeout(300);
  await page.click("text=Empezar expedición");
  await page.waitForTimeout(1800);
  // alejarse del NPC de la Arena (spawn queda pegado a él) para que las
  // capturas no salgan con su aro/texto encima del personaje
  await page.keyboard.down("s");
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("s");
  await page.keyboard.up("d");
  await page.waitForTimeout(300);
}

async function capturarClase(browser, clase) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const errores = [];
  page.on("pageerror", (err) => errores.push(err.message));
  await entrarEnPartida(page, clase.clicksCarrusel);

  const clip = { x: 560, y: 280, width: 180, height: 170 };
  for (const [nombreDir, pos] of Object.entries(DIRECCIONES)) {
    await page.mouse.move(pos.x, pos.y);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SALIDA, `${clase.nombre}_${nombreDir}_idle.png`), clip });

    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.screenshot({ path: path.join(SALIDA, `${clase.nombre}_${nombreDir}_ataque.png`), clip });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }

  await page.close();
  return errores;
}

async function main() {
  asegurarEnvLocal();
  mkdirSync(SALIDA, { recursive: true });

  console.log("[smoke] arrancando servidor de Vite...");
  const vite = await arrancarVite();
  console.log("[smoke] servidor listo, abriendo navegador...");

  let huboErrores = false;
  try {
    const browser = await chromium.launch();
    try {
      for (const clase of CLASES) {
        const errores = await capturarClase(browser, clase);
        if (errores.length) {
          huboErrores = true;
          console.log(`[smoke] ${clase.nombre}: ${errores.length} error(es) de consola`);
          for (const e of errores) console.log("  " + e);
        } else {
          console.log(`[smoke] ${clase.nombre}: ok`);
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    vite.kill();
  }

  console.log(`[smoke] capturas guardadas en ${SALIDA}`);
  if (huboErrores) {
    console.log("[smoke] revisa los errores de arriba -- las capturas se generaron igual.");
    process.exitCode = 1;
  } else {
    console.log("[smoke] sin errores de consola. Revisa las capturas a ojo: esto no sustituye mirarlas.");
  }
}

main().catch((err) => {
  console.error("[smoke] fallo:", err);
  process.exitCode = 1;
});
