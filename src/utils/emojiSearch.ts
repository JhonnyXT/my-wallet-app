/**
 * emojiSearch — sugiere emojis para una categoría a partir de su nombre ("gimnasio" → 🏋️).
 * Diccionario local en español, sin dependencias ni red.
 */
import { levenshtein } from "@/src/utils/fuzzyMatch";

export const EMOJI_KEYWORDS: { emoji: string; keywords: string[] }[] = [
  // Finanzas / dinero
  {
    emoji: "💰",
    keywords: ["dinero", "plata", "ahorro", "ahorros", "bolsa", "fondo", "caja", "efectivo"],
  },
  {
    emoji: "💵",
    keywords: [
      "dinero",
      "efectivo",
      "billete",
      "dolar",
      "dolares",
      "plata",
      "cash",
      "salario",
      "sueldo",
    ],
  },
  {
    emoji: "💳",
    keywords: [
      "nu",
      "nubank",
      "rappicard",
      "visa",
      "mastercard",
      "amex",
      "debito",
      "tarjeta",
      "credito",
      "debito",
      "cuota",
      "pago",
      "banco",
    ],
  },
  {
    emoji: "🏦",
    keywords: [
      "bancolombia",
      "davivienda",
      "bbva",
      "bogota",
      "colpatria",
      "scotiabank",
      "itau",
      "villas",
      "caja social",
      "occidente",
      "popular",
      "dinero",
      "banco",
      "prestamo",
      "credito",
      "hipoteca",
      "financiera",
      "cuenta",
    ],
  },
  {
    emoji: "💸",
    keywords: ["dinero", "gasto", "gastos", "pago", "deuda", "transferencia", "envio"],
  },
  {
    emoji: "🪙",
    keywords: ["dinero", "moneda", "monedas", "cripto", "bitcoin", "cambio", "sencillo"],
  },
  {
    emoji: "📈",
    keywords: ["inversion", "inversiones", "acciones", "bolsa", "rendimiento", "ganancia", "cdt"],
  },
  { emoji: "📊", keywords: ["negocio", "ventas", "estadistica", "reporte", "contabilidad"] },
  {
    emoji: "🧾",
    keywords: ["factura", "facturas", "recibo", "impuesto", "impuestos", "cuenta", "servicios"],
  },
  {
    emoji: "🏛️",
    keywords: ["impuesto", "impuestos", "dian", "gobierno", "tramite", "tramites", "notaria"],
  },
  {
    emoji: "🤝",
    keywords: ["prestamo", "deuda", "negocio", "freelance", "cliente", "comision", "socio"],
  },
  {
    emoji: "💼",
    keywords: ["trabajo", "salario", "sueldo", "nomina", "oficina", "empleo", "empresa"],
  },
  { emoji: "🧑‍💻", keywords: ["freelance", "programacion", "remoto", "proyecto", "trabajo"] },
  { emoji: "🏷️", keywords: ["venta", "ventas", "descuento", "oferta", "precio"] },
  {
    emoji: "🐷",
    keywords: ["ahorros", "ahorro", "alcancia", "cuenta de ahorros", "bolsillo", "colchon"],
  },
  // Comida / bebida
  {
    emoji: "🍔",
    keywords: ["comida", "hamburguesa", "comer", "rapida", "restaurante", "almuerzo"],
  },
  { emoji: "🍕", keywords: ["pizza", "comida", "domicilio", "rappi"] },
  { emoji: "🍽️", keywords: ["restaurante", "comer", "almuerzo", "cena", "comida", "afuera"] },
  { emoji: "🥗", keywords: ["ensalada", "saludable", "dieta", "almuerzo", "comida"] },
  { emoji: "🍳", keywords: ["desayuno", "cocina", "huevos", "comida"] },
  { emoji: "🍩", keywords: ["postre", "dulce", "dulces", "panaderia", "mecato", "donas"] },
  { emoji: "🍰", keywords: ["torta", "pastel", "postre", "cumpleanos", "reposteria"] },
  { emoji: "🥐", keywords: ["panaderia", "pan", "desayuno", "onces"] },
  { emoji: "🍿", keywords: ["mecato", "snack", "snacks", "cine", "palomitas"] },
  { emoji: "☕", keywords: ["cafe", "tinto", "cafeteria", "starbucks", "juan valdez", "desayuno"] },
  { emoji: "🧋", keywords: ["bebida", "bebidas", "te", "jugo", "malteada"] },
  { emoji: "🍺", keywords: ["cerveza", "bar", "trago", "tragos", "fiesta", "rumba", "licor"] },
  { emoji: "🍷", keywords: ["vino", "licor", "trago", "cena", "bar"] },
  {
    emoji: "🛒",
    keywords: [
      "mercado",
      "supermercado",
      "super",
      "viveres",
      "despensa",
      "compras",
      "exito",
      "d1",
      "ara",
    ],
  },
  { emoji: "🥦", keywords: ["verduras", "fruver", "frutas", "mercado", "plaza"] },
  { emoji: "🍎", keywords: ["frutas", "fruta", "fruver", "saludable"] },
  { emoji: "🥩", keywords: ["carne", "carniceria", "asado", "mercado"] },
  { emoji: "🛵", keywords: ["domicilio", "domicilios", "rappi", "delivery", "moto", "didi"] },
  // Transporte
  { emoji: "🚗", keywords: ["carro", "auto", "vehiculo", "transporte", "parqueadero", "parqueo"] },
  {
    emoji: "🚙",
    keywords: [
      "credito vehicular",
      "leasing",
      "carro",
      "camioneta",
      "vehiculo",
      "soat",
      "tecnomecanica",
      "seguro",
    ],
  },
  { emoji: "🚕", keywords: ["taxi", "uber", "didi", "cabify", "transporte"] },
  {
    emoji: "🚌",
    keywords: ["bus", "buseta", "transporte", "pasaje", "transmilenio", "sitp", "mio"],
  },
  { emoji: "🚇", keywords: ["metro", "tren", "transporte", "pasaje"] },
  { emoji: "🚲", keywords: ["bicicleta", "bici", "cicla", "ciclismo"] },
  { emoji: "🏍️", keywords: ["moto", "motocicleta", "soat"] },
  {
    emoji: "⛽",
    keywords: ["gasolina", "combustible", "gas", "tanqueo", "tanquear", "acpm", "bomba"],
  },
  { emoji: "🅿️", keywords: ["parqueadero", "parqueo", "estacionamiento"] },
  { emoji: "🛣️", keywords: ["peaje", "peajes", "carretera", "viaje"] },
  {
    emoji: "🔧",
    keywords: ["mantenimiento", "taller", "reparacion", "arreglo", "mecanico", "herramienta"],
  },
  {
    emoji: "✈️",
    keywords: ["viaje", "viajes", "vuelo", "avion", "tiquete", "tiquetes", "aeropuerto"],
  },
  // Hogar / servicios
  { emoji: "🏠", keywords: ["casa", "hogar", "arriendo", "alquiler", "renta", "vivienda"] },
  { emoji: "🏢", keywords: ["apartamento", "administracion", "edificio", "oficina", "conjunto"] },
  { emoji: "🔑", keywords: ["arriendo", "alquiler", "renta", "llaves", "hogar"] },
  { emoji: "💡", keywords: ["luz", "energia", "electricidad", "servicios", "recibo"] },
  { emoji: "💧", keywords: ["agua", "acueducto", "servicios", "recibo"] },
  { emoji: "🔥", keywords: ["gas", "servicios", "recibo", "calefaccion"] },
  { emoji: "📶", keywords: ["internet", "wifi", "plan", "fibra"] },
  {
    emoji: "📱",
    keywords: [
      "nequi",
      "daviplata",
      "billetera",
      "movii",
      "celular",
      "telefono",
      "plan",
      "movil",
      "suscripcion",
      "suscripciones",
      "app",
    ],
  },
  { emoji: "💻", keywords: ["computador", "portatil", "tecnologia", "software", "laptop", "pc"] },
  { emoji: "📺", keywords: ["television", "tv", "netflix", "streaming", "cable", "suscripcion"] },
  { emoji: "🛋️", keywords: ["muebles", "mueble", "decoracion", "hogar", "sala"] },
  { emoji: "🧹", keywords: ["aseo", "limpieza", "empleada", "domestica", "hogar"] },
  { emoji: "🧺", keywords: ["lavanderia", "ropa", "aseo", "lavado"] },
  {
    emoji: "🛠️",
    keywords: ["reparacion", "arreglos", "ferreteria", "herramientas", "mantenimiento"],
  },
  { emoji: "🪴", keywords: ["plantas", "jardin", "jardineria", "vivero"] },
  { emoji: "🛡️", keywords: ["seguro", "seguros", "poliza", "proteccion"] },
  // Compras / ropa / cuidado
  { emoji: "🛍️", keywords: ["compras", "shopping", "tienda", "centro comercial", "amazon"] },
  { emoji: "👕", keywords: ["ropa", "camisa", "camiseta", "vestuario", "prenda"] },
  { emoji: "👗", keywords: ["vestido", "ropa", "moda"] },
  { emoji: "👟", keywords: ["zapatos", "tenis", "zapatillas", "calzado"] },
  { emoji: "👜", keywords: ["bolso", "cartera", "accesorios", "moda"] },
  { emoji: "🎒", keywords: ["maleta", "morral", "colegio", "utiles"] },
  { emoji: "💎", keywords: ["lujo", "joya", "joyas", "joyeria"] },
  { emoji: "⌚", keywords: ["reloj", "accesorios", "lujo"] },
  { emoji: "🕶️", keywords: ["gafas", "lentes", "accesorios", "optica"] },
  { emoji: "💄", keywords: ["maquillaje", "belleza", "cosmeticos"] },
  { emoji: "💅", keywords: ["unas", "manicure", "belleza", "spa"] },
  { emoji: "💇", keywords: ["peluqueria", "corte", "pelo", "cabello", "barberia", "belleza"] },
  { emoji: "💈", keywords: ["barberia", "barbero", "corte", "peluqueria"] },
  { emoji: "🧴", keywords: ["cuidado", "personal", "aseo", "higiene", "drogueria", "crema"] },
  { emoji: "🧼", keywords: ["aseo", "higiene", "jabon", "limpieza"] },
  { emoji: "👤", keywords: ["personal", "yo", "gastos personales", "propio"] },
  // Salud / bienestar
  { emoji: "🏥", keywords: ["salud", "hospital", "clinica", "eps", "urgencias", "medico"] },
  { emoji: "🩺", keywords: ["medico", "doctor", "consulta", "cita", "salud", "prepagada"] },
  { emoji: "💊", keywords: ["medicina", "medicamentos", "drogueria", "farmacia", "pastillas"] },
  { emoji: "🦷", keywords: ["dentista", "odontologo", "odontologia", "dientes", "ortodoncia"] },
  { emoji: "👓", keywords: ["optica", "lentes", "gafas", "optometra"] },
  { emoji: "🧠", keywords: ["psicologo", "psicologia", "terapia", "mental"] },
  { emoji: "❤️", keywords: ["salud", "amor", "pareja", "novia", "novio", "corazon"] },
  { emoji: "🏋️", keywords: ["gimnasio", "gym", "pesas", "entrenamiento", "ejercicio", "fitness"] },
  { emoji: "🧘", keywords: ["yoga", "meditacion", "bienestar", "pilates"] },
  { emoji: "💆", keywords: ["spa", "masaje", "masajes", "relajacion", "bienestar"] },
  // Entretenimiento
  {
    emoji: "🎮",
    keywords: [
      "videojuegos",
      "juegos",
      "juego",
      "gaming",
      "consola",
      "playstation",
      "xbox",
      "nintendo",
    ],
  },
  {
    emoji: "🎬",
    keywords: ["cine", "pelicula", "peliculas", "netflix", "streaming", "entretenimiento"],
  },
  { emoji: "🎵", keywords: ["musica", "spotify", "canciones", "concierto"] },
  { emoji: "🎤", keywords: ["concierto", "karaoke", "evento", "show"] },
  { emoji: "🎟️", keywords: ["boletas", "entradas", "evento", "eventos", "tiquete", "concierto"] },
  { emoji: "🎉", keywords: ["fiesta", "fiestas", "celebracion", "rumba", "parche"] },
  { emoji: "🎨", keywords: ["arte", "pintura", "manualidades", "hobby", "diseno"] },
  { emoji: "📚", keywords: ["libros", "libro", "lectura", "biblioteca", "estudio"] },
  { emoji: "🎲", keywords: ["juegos", "apuestas", "casino", "loteria", "chance"] },
  { emoji: "🎳", keywords: ["bolos", "ocio", "diversion", "salida"] },
  { emoji: "📸", keywords: ["fotografia", "fotos", "camara"] },
  { emoji: "🎁", keywords: ["regalo", "regalos", "cumpleanos", "detalle", "obsequio", "navidad"] },
  { emoji: "🎄", keywords: ["navidad", "diciembre", "novena", "regalos"] },
  // Educación / trabajo
  {
    emoji: "🎓",
    keywords: [
      "icetex",
      "educacion",
      "universidad",
      "estudio",
      "estudios",
      "matricula",
      "semestre",
      "posgrado",
    ],
  },
  { emoji: "🏫", keywords: ["colegio", "escuela", "pension", "educacion", "jardin"] },
  { emoji: "📖", keywords: ["curso", "cursos", "clase", "clases", "estudio", "aprendizaje"] },
  { emoji: "✏️", keywords: ["utiles", "papeleria", "escolar", "tareas"] },
  { emoji: "📝", keywords: ["tramite", "tramites", "papeleo", "notas", "documentos"] },
  { emoji: "🌐", keywords: ["idiomas", "ingles", "online", "internet", "dominio", "hosting"] },
  { emoji: "🎯", keywords: ["meta", "metas", "objetivo", "proposito"] },
  // Personas / familia
  { emoji: "👶", keywords: ["bebe", "hijo", "hija", "panales", "ninos", "guarderia"] },
  { emoji: "👨‍👩‍👧", keywords: ["familia", "hijos", "casa", "familiar"] },
  { emoji: "👵", keywords: ["abuela", "abuelo", "padres", "mama", "papa"] },
  { emoji: "💍", keywords: ["boda", "matrimonio", "anillo", "compromiso"] },
  { emoji: "💑", keywords: ["pareja", "novia", "novio", "citas", "aniversario"] },
  { emoji: "⛪", keywords: ["iglesia", "diezmo", "ofrenda", "religion"] },
  { emoji: "🙏", keywords: ["donacion", "donaciones", "caridad", "diezmo", "ayuda"] },
  // Mascotas
  {
    emoji: "🐾",
    keywords: [
      "mascota",
      "mascotas",
      "veterinario",
      "veterinaria",
      "concentrado",
      "comida mascota",
    ],
  },
  { emoji: "🐕", keywords: ["perro", "perros", "mascota", "perrito", "guarderia canina"] },
  { emoji: "🐈", keywords: ["gato", "gatos", "mascota", "gatito", "arena"] },
  { emoji: "🐟", keywords: ["pez", "peces", "acuario", "pescado"] },
  // Viajes / ocio
  { emoji: "🧳", keywords: ["viaje", "viajes", "vacaciones", "equipaje", "maleta"] },
  { emoji: "🏖️", keywords: ["playa", "vacaciones", "mar", "costa", "paseo"] },
  { emoji: "🌴", keywords: ["vacaciones", "tropical", "paseo", "descanso"] },
  { emoji: "🏨", keywords: ["hotel", "hospedaje", "airbnb", "alojamiento"] },
  { emoji: "🏔️", keywords: ["montana", "excursion", "camping", "senderismo"] },
  { emoji: "🏕️", keywords: ["camping", "acampar", "paseo", "excursion"] },
  { emoji: "🗺️", keywords: ["turismo", "tour", "excursion", "paseo"] },
  { emoji: "🎢", keywords: ["parque", "diversiones", "atracciones", "paseo"] },
  // Deportes
  { emoji: "⚽", keywords: ["futbol", "deporte", "deportes", "cancha", "partido"] },
  { emoji: "🏀", keywords: ["baloncesto", "basketball", "deporte"] },
  { emoji: "🎾", keywords: ["tenis", "padel", "raqueta", "deporte"] },
  { emoji: "🏊", keywords: ["natacion", "piscina", "nadar", "deporte"] },
  { emoji: "🚴", keywords: ["ciclismo", "bicicleta", "deporte"] },
  { emoji: "⛳", keywords: ["golf", "club", "deporte"] },
  { emoji: "🥊", keywords: ["boxeo", "artes marciales", "deporte"] },
  { emoji: "🏃", keywords: ["correr", "running", "carrera", "maraton", "deporte"] },
  { emoji: "🏆", keywords: ["premio", "premios", "torneo", "logro", "bono"] },
  // Ingresos
  { emoji: "💹", keywords: ["intereses", "rendimientos", "dividendos", "inversion"] },
  { emoji: "🧧", keywords: ["bono", "prima", "extra", "aguinaldo", "regalo"] },
  { emoji: "🏘️", keywords: ["arriendo", "renta", "inmueble", "propiedad", "alquiler"] },
  { emoji: "💲", keywords: ["dinero", "ingreso", "ingresos", "extra", "venta", "pago"] },
];

export const ALL_CATEGORY_EMOJIS: string[] = EMOJI_KEYWORDS.map((e) => e.emoji);

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ñ/g, "n");
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

function tokenScore(q: string, kw: string): number {
  if (q === kw) return 4;
  if (kw.startsWith(q)) return 3; // escribiendo: "gim" → "gimnasio"
  if (q.length >= 4 && q.startsWith(kw) && kw.length >= 4) return 2; // plural: "perros" → "perro"
  if (q.length >= 5 && kw.length >= 5 && levenshtein(q, kw) <= 1) return 1; // typo
  return 0;
}

/** Emojis que corresponden al nombre, de más a menos relevante. Vacío si no hay coincidencias. */
export function suggestEmojis(query: string, limit = 12): string[] {
  const qTokens = tokens(query);
  if (qTokens.length === 0) return [];

  const scored: { emoji: string; score: number; idx: number }[] = [];
  EMOJI_KEYWORDS.forEach(({ emoji, keywords }, idx) => {
    const kwTokens = keywords.flatMap(tokens);
    let score = 0;
    for (const q of qTokens) {
      let best = 0;
      for (const kw of kwTokens) best = Math.max(best, tokenScore(q, kw));
      score += best;
    }
    if (score > 0) scored.push({ emoji, score, idx });
  });

  return scored
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, limit)
    .map((s) => s.emoji);
}
